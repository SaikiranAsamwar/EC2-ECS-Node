const API_BASE = '/api/projects';
const DEFAULT_PAGE_SIZE = 6;

const projectForm = document.getElementById('projectForm');
const projectsContainer = document.getElementById('projects');
const messageBox = document.getElementById('message');
const searchInput = document.getElementById('search');
const filterStatus = document.getElementById('filterStatus');
const sortBy = document.getElementById('sortBy');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

const totalCount = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const inProgressCount = document.getElementById('inProgressCount');

const editDialog = document.getElementById('editDialog');
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editName = document.getElementById('editName');
const editTech = document.getElementById('editTech');
const editStatus = document.getElementById('editStatus');
const cancelEdit = document.getElementById('cancelEdit');

let projects = [];
let paginationState = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1
};
let loadSequence = 0;

const showMessage = (text, isError = false) => {
  messageBox.textContent = text;
  messageBox.style.color = isError ? '#9f1239' : '#5f6b7a';
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const updateStats = async () => {
  const stats = await fetchJson(`${API_BASE}/stats/summary`);
  totalCount.textContent = stats.total || 0;
  completedCount.textContent = stats.completed || 0;
  inProgressCount.textContent = stats.inProgress || 0;
};

const formatDate = (date) => {
  if (!date) {
    return 'Unknown date';
  }

  return new Date(date).toLocaleDateString();
};

const cloneProjects = () => projects.map((project) => ({ ...project }));

const captureSnapshot = () => ({
  projects: cloneProjects(),
  paginationState: { ...paginationState }
});

const restoreSnapshot = (snapshot) => {
  projects = snapshot.projects.map((project) => ({ ...project }));
  paginationState = { ...snapshot.paginationState };
  renderProjects();
  renderPagination();
};

const renderPagination = () => {
  const { page, total, totalPages } = paginationState;
  pageInfo.textContent = `Page ${page} of ${totalPages} • ${total} project(s)`;
  prevPage.disabled = page <= 1 || total === 0;
  nextPage.disabled = page >= totalPages || total === 0;
};

const renderProjects = () => {
  if (!projects.length) {
    projectsContainer.innerHTML = '<p class="meta">No projects found. Add your first project above.</p>';
    return;
  }

  projectsContainer.innerHTML = projects.map((project) => {
    const isPending = Boolean(project.pending);
    let statusClass = 'progress';
    if (isPending) {
      statusClass = 'pending';
    } else if (project.status === 'Completed') {
      statusClass = 'completed';
    }
    const badgeText = isPending ? 'Saving...' : project.status;

    return `
      <article class="card${isPending ? ' pending' : ''}" data-id="${project._id}">
        <div class="card-head">
          <h4>${project.name}</h4>
          <span class="badge ${statusClass}">${badgeText}</span>
        </div>
        <p class="meta">${project.tech}</p>
        <p class="meta">Updated: ${formatDate(project.updatedAt)}</p>
        ${isPending ? '<p class="meta">Waiting for server confirmation...</p>' : ''}
        ${isPending ? '' : `
          <div class="card-actions">
            <button type="button" data-action="toggle">Toggle Status</button>
            <button type="button" data-action="edit">Edit</button>
            <button type="button" class="delete" data-action="delete">Delete</button>
          </div>
        `}
      </article>
    `;
  }).join('');
};

const buildQuery = (page) => {
  const params = new URLSearchParams();
  const searchValue = searchInput.value.trim();

  params.append('page', String(page));
  params.append('limit', String(paginationState.limit));
  params.append('sort', sortBy.value || 'newest');

  if (filterStatus.value !== 'All') {
    params.append('status', filterStatus.value);
  }

  if (searchValue) {
    params.append('q', searchValue);
  }

  return params.toString();
};

const loadProjects = async ({ page = paginationState.page, silent = false } = {}) => {
  const requestId = ++loadSequence;
  paginationState.page = page;

  try {
    const data = await fetchJson(`${API_BASE}?${buildQuery(page)}`);

    if (requestId !== loadSequence) {
      return;
    }

    projects = data.projects || [];
    paginationState = {
      page: data.page || page,
      limit: data.limit || DEFAULT_PAGE_SIZE,
      total: data.total || 0,
      totalPages: data.totalPages || 1
    };

    renderProjects();
    renderPagination();

    if (!silent) {
      showMessage(`Loaded ${paginationState.total} project(s).`);
    }
  } catch (error) {
    if (!silent) {
      showMessage(error.message, true);
    }
  }
};

const refreshAfterMutation = async (page = paginationState.page) => {
  await Promise.all([loadProjects({ page, silent: true }), updateStats()]);
};

const createProject = async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('name').value.trim(),
    tech: document.getElementById('tech').value.trim(),
    status: document.getElementById('status').value
  };

  const snapshot = captureSnapshot();
  const tempProject = {
    _id: `temp-${Date.now()}`,
    ...payload,
    pending: true,
    updatedAt: new Date().toISOString()
  };

  const shouldOptimisticallyShow = paginationState.page === 1 && sortBy.value === 'newest' && filterStatus.value === 'All' && !searchInput.value.trim();

  if (shouldOptimisticallyShow) {
    projects = [tempProject, ...projects].slice(0, paginationState.limit);
    renderProjects();
    renderPagination();
  }

  try {
    await fetchJson(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    projectForm.reset();
    showMessage('Project created successfully.');
    await refreshAfterMutation(1);
  } catch (error) {
    restoreSnapshot(snapshot);
    showMessage(error.message, true);
  }
};

const openEditDialog = (project) => {
  editId.value = project._id;
  editName.value = project.name;
  editTech.value = project.tech;
  editStatus.value = project.status;
  editDialog.showModal();
};

const submitEdit = async (event) => {
  event.preventDefault();

  const id = editId.value;
  const payload = {
    name: editName.value.trim(),
    tech: editTech.value.trim(),
    status: editStatus.value
  };

  const snapshot = captureSnapshot();
  const optimisticProject = projects.find((project) => project._id === id);

  if (optimisticProject) {
    Object.assign(optimisticProject, payload, { updatedAt: new Date().toISOString() });
    renderProjects();
  }

  try {
    await fetchJson(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    editDialog.close();
    showMessage('Project updated successfully.');
    await refreshAfterMutation(paginationState.page);
  } catch (error) {
    restoreSnapshot(snapshot);
    showMessage(error.message, true);
  }
};

const handleCardAction = async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const card = event.target.closest('.card');
  const projectId = card?.dataset?.id;
  const action = button.dataset.action;
  const project = projects.find((item) => item._id === projectId);

  if (!project || !projectId) {
    return;
  }

  if (action === 'edit') {
    openEditDialog(project);
    return;
  }

  const snapshot = captureSnapshot();

  try {
    if (action === 'toggle') {
      const nextStatus = project.status === 'Completed' ? 'In Progress' : 'Completed';
      project.status = nextStatus;
      project.updatedAt = new Date().toISOString();
      renderProjects();

      await fetchJson(`${API_BASE}/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: nextStatus })
      });

      showMessage('Status updated.');
      await refreshAfterMutation(paginationState.page);
    }

    if (action === 'delete') {
      projects = projects.filter((item) => item._id !== projectId);
      renderProjects();
      renderPagination();

      await fetchJson(`${API_BASE}/${projectId}`, {
        method: 'DELETE'
      });

      const nextPage = projects.length === 0 && paginationState.page > 1 ? paginationState.page - 1 : paginationState.page;
      showMessage('Project deleted.');
      await refreshAfterMutation(nextPage);
    }
  } catch (error) {
    restoreSnapshot(snapshot);
    showMessage(error.message, true);
  }
};

const debounce = (callback, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
};

const resetAndLoad = () => loadProjects({ page: 1 });

projectForm.addEventListener('submit', createProject);
projectsContainer.addEventListener('click', handleCardAction);
searchInput.addEventListener('input', debounce(resetAndLoad, 250));
filterStatus.addEventListener('change', resetAndLoad);
sortBy.addEventListener('change', resetAndLoad);
editForm.addEventListener('submit', submitEdit);
cancelEdit.addEventListener('click', () => editDialog.close());
prevPage.addEventListener('click', () => loadProjects({ page: Math.max(paginationState.page - 1, 1) }));
nextPage.addEventListener('click', () => loadProjects({ page: Math.min(paginationState.page + 1, paginationState.totalPages) }));

await Promise.all([loadProjects({ page: 1, silent: true }), updateStats()]);
