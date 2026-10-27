/**
 * ============================================================================
 * Campus Library GraphQL Client Application
 * Developer : Ritik Kumar (Roll No: 20251651078)
 * Course    : CS543 - Web Services | IIIT Vadodara
 * ============================================================================
 */

const API_ENDPOINT = 'http://localhost:4000/';

// State Management
let state = {
  authors: [],
  books: [],
  stats: { totalAuthors: 0, totalBooks: 0, systemStatus: 'Initializing' },
  activeTab: 'authors',
  searchQuery: '',
  selectedCountry: 'ALL',
  lastLatencyMs: 0,
  isOnline: true,
};

// ----------------------------------------------------------------------------
// Core GraphQL Fetch Helper
// ----------------------------------------------------------------------------
async function executeGraphQL(query, variables = {}) {
  const startTime = performance.now();
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const elapsed = Math.round(performance.now() - startTime);
    state.lastLatencyMs = elapsed;
    updateLatencyBadge(elapsed);
    setConnectionStatus(true);

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message);
    }

    return json.data;
  } catch (err) {
    setConnectionStatus(false);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// UI Status & Latency Updaters
// ----------------------------------------------------------------------------
function setConnectionStatus(online) {
  state.isOnline = online;
  const statusEl = document.getElementById('serverStatus');
  if (!statusEl) return;
  
  if (online) {
    statusEl.className = 'status-indicator';
    statusEl.innerHTML = `<span class="pulse-dot"></span> GraphQL Engine Active (:4000)`;
  } else {
    statusEl.className = 'status-indicator offline';
    statusEl.innerHTML = `<span class="pulse-dot"></span> Server Offline (node server.js)`;
  }
}

function updateLatencyBadge(ms) {
  const latencyEl = document.getElementById('latencyStat');
  if (latencyEl) {
    latencyEl.textContent = `${ms} ms`;
  }
}

// ----------------------------------------------------------------------------
// Data Loading & Synchronization
// ----------------------------------------------------------------------------
async function refreshAllData() {
  const refreshBtn = document.getElementById('btnRefresh');
  if (refreshBtn) refreshBtn.style.transform = 'rotate(360deg)';

  try {
    const query = `
      query GetLibraryOverview {
        authors {
          id
          name
          country
          bookCount
          books {
            id
            title
            year
          }
        }
        books {
          id
          title
          year
          author {
            id
            name
          }
        }
        stats {
          totalAuthors
          totalBooks
          systemStatus
        }
      }
    `;

    const data = await executeGraphQL(query);
    state.authors = data.authors || [];
    state.books = data.books || [];
    state.stats = data.stats || { totalAuthors: 0, totalBooks: 0, systemStatus: 'Active' };

    renderStats();
    renderAuthorSelectDropdown();
    renderActiveView();
  } catch (err) {
    console.error('Error syncing library data:', err);
    showToast(`Failed to connect to GraphQL API: ${err.message}`, 'error');
  } finally {
    if (refreshBtn) {
      setTimeout(() => { refreshBtn.style.transform = 'none'; }, 400);
    }
  }
}

// ----------------------------------------------------------------------------
// Render Views
// ----------------------------------------------------------------------------
function renderStats() {
  const authorsCountEl = document.getElementById('totalAuthorsCount');
  const booksCountEl = document.getElementById('totalBooksCount');
  const statusLabelEl = document.getElementById('engineStatusLabel');

  if (authorsCountEl) authorsCountEl.textContent = state.authors.length;
  if (booksCountEl) booksCountEl.textContent = state.books.length;
  if (statusLabelEl) statusLabelEl.textContent = state.stats.systemStatus || 'Online';
}

function renderAuthorSelectDropdown() {
  const select = document.getElementById('bookAuthorSelect');
  if (!select) return;

  if (state.authors.length === 0) {
    select.innerHTML = '<option value="">No authors found (Add one first)</option>';
    return;
  }

  select.innerHTML = state.authors.map(a => `
    <option value="${a.id}">${a.name} (${a.country || 'Global'})</option>
  `).join('');
}

function renderActiveView() {
  if (state.activeTab === 'authors') {
    renderAuthorsGrid();
  } else if (state.activeTab === 'catalog') {
    renderMasterCatalog();
  }
}

// View 1: Authors Grid
function renderAuthorsGrid() {
  const container = document.getElementById('mainContentArea');
  if (!container) return;

  const query = state.searchQuery.toLowerCase().trim();
  
  // Filter authors based on search input
  const filteredAuthors = state.authors.filter(author => {
    const matchesAuthor = author.name.toLowerCase().includes(query) || (author.country && author.country.toLowerCase().includes(query));
    const matchesAnyBook = author.books && author.books.some(b => b.title.toLowerCase().includes(query));
    return matchesAuthor || matchesAnyBook;
  });

  if (filteredAuthors.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted); grid-column: 1 / -1;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
        <h3 style="color: var(--text-primary); margin-bottom: 0.3rem;">No Authors or Books Found</h3>
        <p>No records matched your search query "${escapeHTML(state.searchQuery)}".</p>
      </div>
    `;
    return;
  }

  container.className = 'authors-grid';
  container.innerHTML = filteredAuthors.map(author => {
    const initials = author.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const books = author.books || [];

    return `
      <div class="author-card" id="author-${author.id}">
        <div class="author-header">
          <div class="author-title-group">
            <div class="author-avatar">${initials}</div>
            <div>
              <h3 class="author-name">${escapeHTML(author.name)}</h3>
              <div class="author-country">
                <span>📍</span> ${escapeHTML(author.country || 'International')}
              </div>
            </div>
          </div>
          <span class="book-count-badge">${books.length} ${books.length === 1 ? 'Book' : 'Books'}</span>
        </div>

        <div class="books-container">
          ${books.length === 0 ? `
            <div class="empty-books-state">No books registered yet for this author.</div>
          ` : books.map(book => `
            <div class="book-item">
              <div class="book-details">
                <span class="book-icon">📖</span>
                <span class="book-title" title="${escapeHTML(book.title)}">${escapeHTML(book.title)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span class="book-year">${book.year || 'N/A'}</span>
                <button class="btn-delete-book" onclick="handleDeleteBook('${book.id}', '${escapeHTML(book.title)}')" title="Delete book via GraphQL mutation">
                  ✕
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// View 2: Master Catalog Table
function renderMasterCatalog() {
  const container = document.getElementById('mainContentArea');
  if (!container) return;

  const query = state.searchQuery.toLowerCase().trim();
  const filteredBooks = state.books.filter(b => 
    b.title.toLowerCase().includes(query) || 
    (b.author && b.author.name.toLowerCase().includes(query)) ||
    (b.year && String(b.year).includes(query))
  );

  container.className = 'catalog-card';
  container.innerHTML = `
    <table class="catalog-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Book Title</th>
          <th>Author</th>
          <th>Year</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${filteredBooks.length === 0 ? `
          <tr><td colspan="5" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No books found matching search criteria.</td></tr>
        ` : filteredBooks.map(b => `
          <tr>
            <td style="font-family: 'JetBrains Mono', monospace; color: var(--text-muted);">#${b.id}</td>
            <td style="font-weight: 600;">${escapeHTML(b.title)}</td>
            <td>${escapeHTML(b.author ? b.author.name : 'Unknown')}</td>
            <td><span class="book-year">${b.year || 'N/A'}</span></td>
            <td style="text-align: right;">
              <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.75rem;" onclick="handleDeleteBook('${b.id}', '${escapeHTML(b.title)}')">
                Delete
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ----------------------------------------------------------------------------
// Mutation Handlers (Write Operations)
// ----------------------------------------------------------------------------
async function handleAddBookSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('bookTitleInput').value.trim();
  const year = parseInt(document.getElementById('bookYearInput').value, 10);
  const authorId = document.getElementById('bookAuthorSelect').value;

  if (!title || !authorId) {
    showToast('Please provide a title and select an author.', 'error');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitAddBook');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving via Mutation...';

  const mutation = `
    mutation AddBookToLibrary($t: String!, $y: Int, $a: ID!) {
      addBook(title: $t, year: $y, authorId: $a) {
        id
        title
        year
        author {
          name
        }
      }
    }
  `;

  try {
    const data = await executeGraphQL(mutation, { t: title, y: year || null, a: authorId });
    showToast(`✅ Successfully catalogued "${data.addBook.title}"!`, 'success');
    closeModal('modalAddBook');
    document.getElementById('formAddBook').reset();
    await refreshAllData();
  } catch (err) {
    showToast(`Mutation failed: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Book Record';
  }
}

async function handleAddAuthorSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('authorNameInput').value.trim();
  const country = document.getElementById('authorCountryInput').value.trim();

  if (!name) {
    showToast('Author name is required.', 'error');
    return;
  }

  const submitBtn = document.getElementById('btnSubmitAddAuthor');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding Author...';

  const mutation = `
    mutation AddAuthorRecord($name: String!, $country: String) {
      addAuthor(name: $name, country: $country) {
        id
        name
        country
      }
    }
  `;

  try {
    const data = await executeGraphQL(mutation, { name, country: country || 'India' });
    showToast(`✅ Author "${data.addAuthor.name}" added to GraphQL store!`, 'success');
    closeModal('modalAddAuthor');
    document.getElementById('formAddAuthor').reset();
    await refreshAllData();
  } catch (err) {
    showToast(`Failed to add author: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register Author';
  }
}

async function handleDeleteBook(id, title) {
  if (!confirm(`Are you sure you want to remove "${title}" from the catalog?`)) {
    return;
  }

  const mutation = `
    mutation RemoveBook($id: ID!) {
      deleteBook(id: $id)
    }
  `;

  try {
    const data = await executeGraphQL(mutation, { id });
    if (data.deleteBook) {
      showToast(`Removed "${title}" from catalog.`, 'success');
      await refreshAllData();
    }
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

// ----------------------------------------------------------------------------
// GraphQL Studio Runner
// ----------------------------------------------------------------------------
async function runStudioQuery() {
  const queryText = document.getElementById('studioQueryText').value;
  const responsePre = document.getElementById('studioResponsePre');
  const runBtn = document.getElementById('btnRunStudio');

  runBtn.disabled = true;
  runBtn.textContent = 'Executing...';
  responsePre.textContent = 'Executing request to Apollo Standalone (:4000)...';

  const startTime = performance.now();
  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText }),
    });
    const elapsed = Math.round(performance.now() - startTime);
    const json = await res.json();
    responsePre.textContent = `// HTTP 200 OK (${elapsed}ms latency)\n` + JSON.stringify(json, null, 2);
  } catch (err) {
    responsePre.textContent = `// Request Failed\nError: ${err.message}`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Execute Query';
  }
}

function loadPresetQuery(preset) {
  const textarea = document.getElementById('studioQueryText');
  if (preset === 'authors') {
    textarea.value = `query GetAllAuthorsAndBooks {\n  authors {\n    id\n    name\n    country\n    bookCount\n    books {\n      id\n      title\n      year\n    }\n  }\n}`;
  } else if (preset === 'stats') {
    textarea.value = `query GetLibraryStats {\n  stats {\n    totalAuthors\n    totalBooks\n    systemStatus\n  }\n  books {\n    id\n    title\n    year\n    author {\n      name\n    }\n  }\n}`;
  } else if (preset === 'mutation') {
    textarea.value = `mutation AddNewDemoBook {\n  addBook(title: "GraphQL Federation Guide", year: 2026, authorId: "3") {\n    id\n    title\n    year\n    author {\n      name\n      country\n    }\n  }\n}`;
  }
  runStudioQuery();
}

// ----------------------------------------------------------------------------
// Modal Controls & Toast Notifications
// ----------------------------------------------------------------------------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✨' : '⚠️'}</span>
    <div>${escapeHTML(message)}</div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ----------------------------------------------------------------------------
// Theme Toggle & Event Listeners
// ----------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('theme_preference') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme_preference', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Search input handler
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderActiveView();
    });
  }

  // View Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.getAttribute('data-tab');

      const studioSection = document.getElementById('studioSection');
      const mainContentArea = document.getElementById('mainContentArea');

      if (state.activeTab === 'studio') {
        studioSection.style.display = 'grid';
        mainContentArea.style.display = 'none';
        runStudioQuery();
      } else {
        studioSection.style.display = 'none';
        mainContentArea.style.display = state.activeTab === 'authors' ? 'grid' : 'block';
        renderActiveView();
      }
    });
  });

  // Form Submissions
  const formAddBook = document.getElementById('formAddBook');
  if (formAddBook) formAddBook.addEventListener('submit', handleAddBookSubmit);

  const formAddAuthor = document.getElementById('formAddAuthor');
  if (formAddAuthor) formAddAuthor.addEventListener('submit', handleAddAuthorSubmit);

  // Initial Data Fetch
  refreshAllData();

  // Polling heartbeat every 10 seconds to verify API connectivity
  setInterval(() => {
    executeGraphQL('{ stats { totalAuthors } }').catch(() => {});
  }, 10000);
});
