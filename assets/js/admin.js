const PROJECTS_API = '/api/admin/projects';
const UPLOAD_API = '/api/admin/media/upload';

let photos = [];
let projects = [];
let editingId = null;

const $ = (id) => document.getElementById(id);

function esc(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function slug(value) {
  return (value || 'project').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function mediaUrl(key) {
  return '/api/media/file/' + key.split('/').map(encodeURIComponent).join('/');
}

function show(id, message, type) {
  const element = $(id);
  element.textContent = message;
  element.className = 'status ' + type;
  element.style.display = 'block';
}

function used(role, except = -1) {
  return photos.some((photo, index) => index !== except && photo.role === role);
}

function syncRolePicker() {
  const picker = $('role');
  [...picker.options].forEach((option) => {
    option.disabled = (option.value === 'before' || option.value === 'after') && used(option.value);
  });
  if (picker.selectedOptions[0]?.disabled) picker.value = 'detail';
}

function renderPhotos() {
  $('photos').innerHTML = photos.map((photo, index) => `
    <div class="photo">
      <img src="${mediaUrl(photo.key)}" alt="Project photo">
      <button type="button" data-remove="${index}">×</button>
      <select data-role="${index}">
        <option value="before" ${photo.role === 'before' ? 'selected' : ''} ${used('before', index) ? 'disabled' : ''}>Before</option>
        <option value="after" ${photo.role === 'after' ? 'selected' : ''} ${used('after', index) ? 'disabled' : ''}>After</option>
        <option value="detail" ${photo.role === 'detail' ? 'selected' : ''}>Detail</option>
      </select>
    </div>`).join('');

  document.querySelectorAll('[data-remove]').forEach((button) => {
    button.onclick = () => {
      photos.splice(Number(button.dataset.remove), 1);
      renderPhotos();
    };
  });

  document.querySelectorAll('[data-role]').forEach((select) => {
    select.onchange = () => {
      const index = Number(select.dataset.role);
      const newRole = select.value;
      if ((newRole === 'before' || newRole === 'after') && used(newRole, index)) {
        select.value = photos[index].role;
        return;
      }
      photos[index].role = newRole;
      renderPhotos();
    };
  });

  syncRolePicker();
}

$('upload').onclick = async () => {
  const file = $('file').files[0];
  const role = $('role').value;
  if (!file) return show('uploadStatus', 'Choose a photo first.', 'error');
  if ((role === 'before' || role === 'after') && used(role)) {
    return show('uploadStatus', `This project already has an ${role === 'after' ? 'After' : 'Before'} photo.`, 'error');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('project', slug($('title').value));
  form.append('role', role);
  $('upload').disabled = true;
  show('uploadStatus', 'Uploading…', '');

  try {
    const response = await fetch(UPLOAD_API, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Upload failed.');
    photos.push({ key: result.key, role });
    $('file').value = '';
    renderPhotos();
    show('uploadStatus', 'Photo added.', 'ok');
  } catch (error) {
    show('uploadStatus', error.message, 'error');
  } finally {
    $('upload').disabled = false;
  }
};

function projectData() {
  return {
    id: editingId,
    title: $('title').value,
    location: $('location').value,
    service: $('service').value,
    description: $('description').value,
    published: $('published').checked,
    photos
  };
}

$('projectForm').onsubmit = async (event) => {
  event.preventDefault();
  show('saveStatus', 'Saving…', '');
  try {
    const response = await fetch(PROJECTS_API, {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(projectData())
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Save failed.');
    reset();
    await load();
  } catch (error) {
    show('saveStatus', error.message, 'error');
  }
};

function edit(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) return;
  editingId = project.id;
  $('title').value = project.title;
  $('location').value = project.location;
  $('service').value = project.service;
  $('description').value = project.description;
  $('published').checked = project.published;
  photos = project.photos.map((photo) => ({ ...photo }));
  renderPhotos();
  $('saveButton').textContent = 'Save changes';
  $('editActions').style.display = 'grid';
  $('editing').style.display = 'block';
  $('editing').textContent = 'Editing: ' + project.title;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reset() {
  editingId = null;
  photos = [];
  renderPhotos();
  $('projectForm').reset();
  syncRolePicker();
  $('saveButton').textContent = 'Save new project';
  $('editActions').style.display = 'none';
  $('editing').style.display = 'none';
  $('saveStatus').style.display = 'none';
}

$('cancel').onclick = reset;

$('delete').onclick = async () => {
  const project = projects.find((item) => item.id === editingId);
  if (!project || !confirm(`Delete “${project.title}”? This removes the project record. Its uploaded image files will be left in storage for safety.`)) return;

  try {
    const response = await fetch(PROJECTS_API, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: editingId })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Delete failed.');
    reset();
    await load();
  } catch (error) {
    show('saveStatus', error.message, 'error');
  }
};

async function load() {
  try {
    const response = await fetch(PROJECTS_API, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Could not load projects.');
    projects = result.projects;
    $('projectList').innerHTML = projects.length
      ? projects.map((project) => `
        <article class="project-card" data-id="${project.id}">
          ${project.photos[0] ? `<img src="${mediaUrl(project.photos[0].key)}" alt="">` : '<div></div>'}
          <div>
            <strong>${esc(project.title)}</strong> <span class="badge">${project.published ? 'Published' : 'Draft'}</span><br>
            <span class="hint">${esc(project.location)} · ${esc(project.service)}<br>${project.photos.length} photo${project.photos.length === 1 ? '' : 's'}</span>
          </div>
        </article>`).join('')
      : '<p class="hint">No saved projects yet.</p>';
    document.querySelectorAll('[data-id]').forEach((element) => {
      element.onclick = () => edit(element.dataset.id);
    });
  } catch (error) {
    console.error('Project manager load failed:', error);
    $('projectList').innerHTML = `<p class="hint">Could not load projects: ${esc(error.message)}</p>`;
  }
}

load();
