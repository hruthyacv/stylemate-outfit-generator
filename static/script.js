document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    
    // Auth Elements
    const authModal = document.getElementById('auth-modal');
    const mainApp = document.getElementById('main-app');
    const userProfile = document.getElementById('user-profile');
    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    // App Elements
    const uploadForm = document.getElementById('upload-form');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const dropZone = document.getElementById('drop-zone');
    const wardrobeContainer = document.getElementById('wardrobe-container');
    const emptyState = document.getElementById('empty-state');
    const generateBtn = document.getElementById('generate-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editImageInput = document.getElementById('edit-image');
    const editImagePreview = document.getElementById('edit-image-preview');
    const editDropZone = document.getElementById('edit-drop-zone');
    
    let allWardrobeItems = [];
    let currentOutfitData = null;

    // ----------------------------------------------------
    // AUTHENTICATION LOGIC
    // ----------------------------------------------------
    
    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (res.ok && data.logged_in) {
                showApp(data.user.name);
            } else {
                showAuth();
            }
        } catch(err) {
            showAuth();
        }
    }

    function showApp(userName) {
        authModal.classList.add('hidden');
        mainApp.classList.remove('hidden');
        userProfile.classList.remove('hidden');
        userGreeting.textContent = `Welcome, ${userName}`;
        
        loadWardrobe();
        loadSavedOutfits();
    }

    function showAuth() {
        // Clear isolated data securely
        allWardrobeItems = [];
        currentOutfitData = null;
        wardrobeContainer.innerHTML = '';
        document.getElementById('saved-looks-container').innerHTML = '';
        document.getElementById('outfit-result').classList.add('hidden');
        
        mainApp.classList.add('hidden');
        userProfile.classList.add('hidden');
        authModal.classList.remove('hidden');
    }

    function handleApiError(res) {
        if (res.status === 401) {
            showAuth();
            return true; // handled
        }
        return false; // not handled
    }

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginError.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        registerError.classList.add('hidden');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('button');
        btn.textContent = 'SIGNING IN...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                loginError.classList.add('hidden');
                loginForm.reset();
                showApp(data.user.name);
            } else {
                loginError.textContent = data.error || 'Login failed';
                loginError.classList.remove('hidden');
            }
        } catch(err) {
            loginError.textContent = 'Network error occurred';
            loginError.classList.remove('hidden');
        } finally {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        
        if (password !== confirm) {
            registerError.textContent = 'Passwords do not match';
            registerError.classList.remove('hidden');
            return;
        }

        const btn = registerForm.querySelector('button');
        btn.textContent = 'CREATING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (res.ok) {
                registerError.classList.add('hidden');
                registerForm.reset();
                showApp(data.user.name);
            } else {
                registerError.textContent = data.error || 'Registration failed';
                registerError.classList.remove('hidden');
            }
        } catch(err) {
            registerError.textContent = 'Network error occurred';
            registerError.classList.remove('hidden');
        } finally {
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        showAuth();
    });

    // Run Auth Check on Start
    checkAuth();

    // ----------------------------------------------------
    // APP LOGIC
    // ----------------------------------------------------

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderWardrobe(e.target.dataset.filter);
        });
    });

    imageUpload.addEventListener('change', handleFileSelect);
    editImageInput.addEventListener('change', (e) => handleFileSelect(e, editImagePreview, 'edit-upload-text'));
    
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            imageUpload.files = e.dataTransfer.files;
            handleFileSelect({ target: imageUpload });
        }
    });

    editDropZone.addEventListener('dragover', (e) => { e.preventDefault(); editDropZone.classList.add('dragover'); });
    editDropZone.addEventListener('dragleave', () => { editDropZone.classList.remove('dragover'); });
    editDropZone.addEventListener('drop', (e) => {
        e.preventDefault(); editDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            editImageInput.files = e.dataTransfer.files;
            handleFileSelect({ target: editImageInput }, editImagePreview, 'edit-upload-text');
        }
    });

    function handleFileSelect(e, previewElem = imagePreview, textId = 'upload-text') {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                previewElem.style.display = 'block';
                previewElem.style.backgroundImage = `url(${ev.target.result})`;
                document.getElementById(textId).textContent = 'Image Selected';
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = uploadForm.querySelector('button');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'UPLOADING...';
        submitBtn.disabled = true;

        const formData = new FormData(uploadForm);
        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            if (handleApiError(response)) return;
            const data = await response.json();
            
            if (data.success) {
                allWardrobeItems.unshift(data.item);
                renderWardrobe(document.querySelector('.filter-btn.active').dataset.filter);
                
                uploadForm.reset();
                imagePreview.style.display = 'none';
                imagePreview.style.backgroundImage = 'none';
                document.getElementById('upload-text').textContent = 'Select Image';
            } else {
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during upload.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    function openEditModal(item) {
        document.getElementById('edit-id').value = item.id;
        document.getElementById('edit-name').value = item.name || '';
        document.getElementById('edit-category').value = item.category;
        document.getElementById('edit-style').value = item.style;
        document.getElementById('edit-color').value = item.color || '';
        
        editImagePreview.style.display = 'block';
        editImagePreview.style.backgroundImage = `url(${item.image_path})`;
        document.getElementById('edit-upload-text').textContent = 'Replace Image (Optional)';
        editImageInput.value = '';
        
        editModal.classList.remove('hidden');
    }

    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const submitBtn = editForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'SAVING...';
        submitBtn.disabled = true;

        const formData = new FormData(editForm);
        try {
            const response = await fetch(`/api/wardrobe/${id}`, { method: 'PUT', body: formData });
            if (handleApiError(response)) return;
            const data = await response.json();
            
            if (data.success) {
                const index = allWardrobeItems.findIndex(i => i.id === id);
                if (index !== -1) {
                    allWardrobeItems[index] = data.item;
                    renderWardrobe(document.querySelector('.filter-btn.active').dataset.filter);
                }
                editModal.classList.add('hidden');
            } else {
                alert(data.error || 'Update failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during update.');
        } finally {
            submitBtn.textContent = 'Save Changes';
            submitBtn.disabled = false;
        }
    });

    generateBtn.addEventListener('click', async () => {
        const style = document.getElementById('gen-style').value;
        const weather = document.getElementById('gen-weather').value;
        
        const originalText = generateBtn.textContent;
        generateBtn.textContent = 'CURATING...';
        generateBtn.disabled = true;
        
        try {
            const response = await fetch(`/generate?style=${style}&weather=${weather}`);
            if (handleApiError(response)) return;
            const data = await response.json();
            
            if (response.ok) {
                currentOutfitData = {
                    top_id: data.outfit.top ? data.outfit.top.id : null,
                    bottom_id: data.outfit.bottom ? data.outfit.bottom.id : null,
                    shoes_id: data.outfit.shoes ? data.outfit.shoes.id : null,
                    accessory_id: data.outfit.accessory ? data.outfit.accessory.id : null,
                    style: style,
                    weather: weather,
                    description: data.ai_suggestion.description
                };
                displayOutfit(data);
            } else {
                alert(data.error || 'Failed to generate outfit');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while generating.');
        } finally {
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
        }
    });

    document.getElementById('save-look-btn').addEventListener('click', async (e) => {
        if (!currentOutfitData) return;
        const btn = e.target;
        btn.textContent = 'SAVING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/outfits/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentOutfitData)
            });
            if (handleApiError(res)) return;
            if (res.ok) {
                btn.textContent = 'SAVED';
                loadSavedOutfits();
                setTimeout(() => {
                    btn.textContent = 'SAVE LOOK';
                    btn.disabled = false;
                }, 2000);
            }
        } catch(err) {
            console.error(err);
            btn.textContent = 'SAVE LOOK';
            btn.disabled = false;
        }
    });

    async function loadWardrobe() {
        try {
            const res = await fetch('/api/wardrobe');
            if (handleApiError(res)) return;
            const data = await res.json();
            allWardrobeItems = data.wardrobe || [];
            renderWardrobe();
        } catch (err) {
            console.error("Could not load wardrobe", err);
        }
    }

    async function loadSavedOutfits() {
        try {
            const res = await fetch('/api/outfits');
            if (handleApiError(res)) return;
            const data = await res.json();
            const container = document.getElementById('saved-looks-container');
            container.innerHTML = '';
            
            if (!data.outfits || data.outfits.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);font-size:0.8rem;">No saved looks yet.</p>';
                return;
            }

            data.outfits.forEach(look => {
                const imgUrl = look.items.top ? look.items.top.image_path : (look.items.bottom ? look.items.bottom.image_path : '');
                const div = document.createElement('div');
                div.className = 'saved-look-item';
                div.innerHTML = `
                    <img src="${imgUrl}" alt="Saved Look">
                    <div class="saved-look-info">
                        <div class="title">${look.style.toUpperCase()} &bull; ${look.weather.toUpperCase()}</div>
                        <div class="date">${new Date(look.created_at).toLocaleDateString()}</div>
                    </div>
                `;
                container.appendChild(div);
            });
        } catch (err) {
            console.error("Could not load outfits", err);
        }
    }

    function renderWardrobe(filter = 'all') {
        wardrobeContainer.innerHTML = '';
        
        const filtered = filter === 'all' 
            ? allWardrobeItems 
            : allWardrobeItems.filter(item => item.category === filter);
            
        document.getElementById('wardrobe-count').textContent = `${filtered.length} ITEMS`;
        
        if (allWardrobeItems.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
        
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'wardrobe-item';
            
            const titleHtml = item.name ? `<div class="item-title">${item.name}</div>` : '';
            
            div.innerHTML = `
                <img src="${item.image_path}" alt="${item.category}">
                <div class="card-actions">
                    <div class="action-btn edit-btn" data-id="${item.id}" title="Edit">
                        <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </div>
                    <div class="action-btn delete-btn" data-id="${item.id}" title="Delete">
                        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </div>
                </div>
                <div class="badge">
                    ${titleHtml}
                    ${item.category} &bull; ${item.style}
                </div>
            `;
            wardrobeContainer.appendChild(div);
            
            div.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(item);
            });
            
            div.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to completely remove this item from your wardrobe?')) {
                    try {
                        const res = await fetch(`/api/wardrobe/${item.id}`, { method: 'DELETE' });
                        if (handleApiError(res)) return;
                        if (res.ok) {
                            allWardrobeItems = allWardrobeItems.filter(i => i.id !== item.id);
                            renderWardrobe(document.querySelector('.filter-btn.active').dataset.filter);
                        }
                    } catch(err) {
                        console.error('Failed to delete', err);
                    }
                }
            });
        });
    }

    function displayOutfit(data) {
        const outfitResult = document.getElementById('outfit-result');
        const outfitGrid = document.getElementById('outfit-grid');
        
        outfitResult.classList.remove('hidden');
        outfitGrid.innerHTML = '';
        
        const pieces = ['top', 'bottom', 'shoes', 'accessory'];
        pieces.forEach(piece => {
            if (data.outfit[piece]) {
                const item = data.outfit[piece];
                const div = document.createElement('div');
                div.className = 'outfit-piece';
                div.innerHTML = `
                    <span>${piece === 'top' && item.category === 'one-piece' ? 'ONE-PIECE' : piece}</span>
                    <img src="${item.image_path}" alt="${piece}">
                `;
                outfitGrid.appendChild(div);
            }
        });

        document.getElementById('ai-aesthetic').textContent = data.ai_suggestion.aesthetic;
        document.getElementById('ai-desc').textContent = data.ai_suggestion.description;
        document.getElementById('ai-tip').textContent = data.ai_suggestion.tip;
    }

    function initCanvas() {
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > width) this.speedX *= -1;
                if (this.y < 0 || this.y > height) this.speedY *= -1;
            }
            draw() {
                ctx.fillStyle = `rgba(220, 220, 220, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for(let i=0; i<80; i++) {
            particles.push(new Particle());
        }

        let time = 0;
        function animate() {
            ctx.clearRect(0, 0, width, height);
            
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            for(let i=0; i<width; i+=20) {
                const y = height / 2 + Math.sin(i * 0.005 + time) * 150;
                ctx.lineTo(i, y);
            }
            ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
            ctx.lineWidth = 1;
            ctx.stroke();

            particles.forEach(p => {
                p.update();
                p.draw();
            });
            
            time += 0.01;
            requestAnimationFrame(animate);
        }
        animate();
    }
});