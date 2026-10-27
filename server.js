// ============================================================================
// server.js -- Apollo GraphQL Standalone Server
// Project   : Campus Library - Modernized Web Services API
// Author    : Ritik Kumar (Roll No: 20251651078)
// Institute : IIIT Vadodara (CS543 - Web Services)
// ============================================================================

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const pool = require('./db');

// In-Memory fallback store for uninterrupted live demos if MySQL credentials aren't set
let isDatabaseConnected = false;
let memAuthors = [
  { id: '1', name: 'Asha Patel', country: 'India' },
  { id: '2', name: 'Ravi Kumar', country: 'India' },
  { id: '3', name: 'Ritik Kumar', country: 'India' },
];
let memBooks = [
  { id: '1', title: 'Databases 101', year: 2020, author_id: 1 },
  { id: '2', title: 'SQL in Practice', year: 2022, author_id: 1 },
  { id: '3', title: 'Web Services Basics', year: 2023, author_id: 2 },
  { id: '4', title: 'GraphQL & Distributed Architecture', year: 2025, author_id: 3 },
  { id: '5', title: 'Cloud Microservices Handbook', year: 2026, author_id: 3 },
];
let nextAuthorId = 4;
let nextBookId = 6;

// 1. GraphQL Schema Definition (SDL)
const typeDefs = `#graphql
  type Author {
    id: ID!
    name: String!
    country: String
    books: [Book!]!
    bookCount: Int!
  }

  type Book {
    id: ID!
    title: String!
    year: Int
    author: Author!
  }

  type LibraryStats {
    totalAuthors: Int!
    totalBooks: Int!
    systemStatus: String!
  }

  type Query {
    authors: [Author!]!
    author(id: ID!): Author
    books: [Book!]!
    book(id: ID!): Book
    stats: LibraryStats!
  }

  type Mutation {
    addBook(title: String!, year: Int, authorId: ID!): Book!
    addAuthor(name: String!, country: String): Author!
    deleteBook(id: ID!): Boolean!
  }
`;

// 2. Resolvers Implementation
const resolvers = {
  Query: {
    authors: async () => {
      if (isDatabaseConnected) {
        try {
          const [rows] = await pool.query('SELECT * FROM authors ORDER BY id ASC');
          return rows;
        } catch (err) {
          console.warn('⚠️ MySQL Query Failed, serving cached data:', err.message);
        }
      }
      return memAuthors;
    },

    author: async (_parent, { id }) => {
      if (isDatabaseConnected) {
        try {
          const [rows] = await pool.query('SELECT * FROM authors WHERE id = ?', [id]);
          return rows[0] || null;
        } catch (err) {
          console.warn('⚠️ MySQL Query Failed:', err.message);
        }
      }
      return memAuthors.find(a => String(a.id) === String(id)) || null;
    },

    books: async () => {
      if (isDatabaseConnected) {
        try {
          const [rows] = await pool.query('SELECT * FROM books ORDER BY id DESC');
          return rows;
        } catch (err) {
          console.warn('⚠️ MySQL Query Failed:', err.message);
        }
      }
      return memBooks;
    },

    book: async (_parent, { id }) => {
      if (isDatabaseConnected) {
        try {
          const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
          return rows[0] || null;
        } catch (err) {
          console.warn('⚠️ MySQL Query Failed:', err.message);
        }
      }
      return memBooks.find(b => String(b.id) === String(id)) || null;
    },

    stats: async () => {
      let totalAuthors = memAuthors.length;
      let totalBooks = memBooks.length;
      if (isDatabaseConnected) {
        try {
          const [[{ count: aCount }]] = await pool.query('SELECT COUNT(*) as count FROM authors');
          const [[{ count: bCount }]] = await pool.query('SELECT COUNT(*) as count FROM books');
          totalAuthors = aCount;
          totalBooks = bCount;
        } catch (e) {
          // fallback to memory counts
        }
      }
      return {
        totalAuthors,
        totalBooks,
        systemStatus: isDatabaseConnected ? 'MySQL Connected' : 'In-Memory Live Demo Active',
      };
    },
  },

  // Relationship Resolvers (1 Author -> Many Books, 1 Book -> 1 Author)
  Author: {
    books: async (author) => {
      if (isDatabaseConnected) {
        try {
          const [rows] = await pool.query('SELECT * FROM books WHERE author_id = ?', [author.id]);
          return rows;
        } catch (err) {
          console.warn('⚠️ MySQL Author.books resolver error:', err.message);
        }
      }
      return memBooks.filter(b => String(b.author_id) === String(author.id));
    },
    bookCount: async (author) => {
      if (isDatabaseConnected) {
        try {
          const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM books WHERE author_id = ?', [author.id]);
          return count;
        } catch (e) {}
      }
      return memBooks.filter(b => String(b.author_id) === String(author.id)).length;
    },
  },

  Book: {
    author: async (book) => {
      const authorId = book.author_id || book.authorId;
      if (isDatabaseConnected) {
        try {
          const [rows] = await pool.query('SELECT * FROM authors WHERE id = ?', [authorId]);
          return rows[0] || null;
        } catch (err) {
          console.warn('⚠️ MySQL Book.author resolver error:', err.message);
        }
      }
      return memAuthors.find(a => String(a.id) === String(authorId)) || null;
    },
  },

  // Mutations
  Mutation: {
    addBook: async (_parent, { title, year, authorId }) => {
      if (isDatabaseConnected) {
        try {
          const [result] = await pool.query(
            'INSERT INTO books (title, year, author_id) VALUES (?, ?, ?)',
            [title, year, authorId]
          );
          const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [result.insertId]);
          return rows[0];
        } catch (err) {
          console.warn('⚠️ MySQL Insert Book error, falling back to memory store:', err.message);
        }
      }
      const newBook = {
        id: String(nextBookId++),
        title,
        year: year || new Date().getFullYear(),
        author_id: Number(authorId),
      };
      memBooks.push(newBook);
      return newBook;
    },

    addAuthor: async (_parent, { name, country }) => {
      if (isDatabaseConnected) {
        try {
          const [result] = await pool.query(
            'INSERT INTO authors (name, country) VALUES (?, ?)',
            [name, country || 'India']
          );
          const [rows] = await pool.query('SELECT * FROM authors WHERE id = ?', [result.insertId]);
          return rows[0];
        } catch (err) {
          console.warn('⚠️ MySQL Insert Author error:', err.message);
        }
      }
      const newAuthor = {
        id: String(nextAuthorId++),
        name,
        country: country || 'India',
      };
      memAuthors.push(newAuthor);
      return newAuthor;
    },

    deleteBook: async (_parent, { id }) => {
      if (isDatabaseConnected) {
        try {
          const [result] = await pool.query('DELETE FROM books WHERE id = ?', [id]);
          return result.affectedRows > 0;
        } catch (err) {
          console.warn('⚠️ MySQL Delete Book error:', err.message);
        }
      }
      const index = memBooks.findIndex(b => String(b.id) === String(id));
      if (index !== -1) {
        memBooks.splice(index, 1);
        return true;
      }
      return false;
    },
  },
};

// 3. Initialize and Start Apollo Server
async function start() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isDatabaseConnected = true;
    console.log('✅ Connected to MySQL database [gqldemo]');
  } catch (err) {
    isDatabaseConnected = false;
    console.log('ℹ️  MySQL not connected:', err.message);
    console.log('🚀 Running with high-availability Live Store (zero-downtime demo mode)');
  }

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                   CAMPUS LIBRARY GRAPHQL ENGINE v2.0                   ║
║  Author     : Ritik Kumar (Roll No: 20251651078)                       ║
║  Course     : CS543 - Web Services | IIIT Vadodara                     ║
╠════════════════════════════════════════════════════════════════════════╣
║  📡 GraphQL API Endpoint  : ${url}                       ║
║  🛠️  Apollo Studio Sandbox : ${url}                       ║
║  💾 Database Backend      : ${isDatabaseConnected ? 'MySQL 8.0 (Live Connection)' : 'Live Memory Engine (Active)'}      ║
╚════════════════════════════════════════════════════════════════════════╝
`);
}

start();
