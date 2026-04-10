async function loadProjects() {
  const res = await fetch('/projects');
  const data = await res.json();

  document.getElementById('projects').innerHTML =
    data.map(p => `
      <div class="card">
        <h3>${p.name}</h3>
        <p>${p.tech}</p>
        <span class="status ${p.status === 'Completed' ? 'completed' : 'progress'}">
          ${p.status}
        </span>
      </div>
    `).join('');
}

async function addProject() {
  const name = document.getElementById('name').value;
  const tech = document.getElementById('tech').value;
  const status = document.getElementById('status').value;

  await fetch('/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, tech, status })
  });

  loadProjects();
}

loadProjects();
