import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm';

const supabaseUrl = 'https://ecsqqzuguvdrhlqsbjci.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3FxenVndXZkcmhscXNiamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NDc2NjQsImV4cCI6MjA0NzEyMzY2NH0.GOWZP1KYpl_tAGjH2FL_16UPkkcpyQB17tWQnDbzBik'

let sectionsSortable;

// Initialize Supabase client with enhanced security options
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

// Security utilities
const security = {
    attempts: new Map(),
    maxAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15 minutes

    validatePassword(password) {
        const requirements = {
            minLength: 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        }

        const errors = []
        if (password.length < requirements.minLength) {
            errors.push('Password must be at least 8 characters long')
        }
        if (!requirements.hasUpperCase || !requirements.hasLowerCase) {
            errors.push('Password must contain both upper and lowercase letters')
        }
        if (!requirements.hasNumbers) {
            errors.push('Password must contain at least one number')
        }
        if (!requirements.hasSpecialChar) {
            errors.push('Password must contain at least one special character')
        }

        if (errors.length > 0) {
            throw new Error(errors.join('. '))
        }
        return true
    },

    sanitizeInput(input) {
        if (typeof input !== 'string') return ''
        return input.replace(/[&<>"']/g, function(m) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }
            return map[m]
        })
    },

    checkRateLimit(email) {
        const attempts = this.attempts.get(email) || 0
        if (attempts >= this.maxAttempts) {
            const remainingTime = Math.ceil(this.lockoutTime / 60000) // Convert to minutes
            throw new Error(`Too many attempts. Please try again in ${remainingTime} minutes.`)
        }
    },

    trackFailedAttempt(email) {
        const attempts = this.attempts.get(email) || 0
        this.attempts.set(email, attempts + 1)
        
        // Reset attempts after lockout period
        setTimeout(() => {
            this.attempts.delete(email)
        }, this.lockoutTime)
    },

    clearAttempts(email) {
        this.attempts.delete(email)
    }
}
async function checkCanInvite(supabaseClient) {
    const { data, error } = await supabaseClient
        .from('authorized_inviters')
        .select('can_invite')
        .single();
    
    if (error) throw error;
    return data?.can_invite || false;
}

async function logInvite(supabaseClient, invitedEmail) {
    const { error } = await supabaseClient
        .from('invite_logs')
        .insert([{ 
            invited_email: invitedEmail
        }]);
    
    if (error) throw error;
}

async function sendInvite(email) {
    try {
        const { data, error } = await supabase
            .rpc('send_invite', { 
                email_to_invite: email 
            });
            
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        
        return data;
    } catch (error) {
        console.error('Error sending invite:', error);
        throw error;
    }
}

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Auth status:', { session, error });
}

const ui = {
    showAuthContainer() {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('userContainer').style.display = 'none';
        document.querySelector('.admin-container').style.display = 'none';  // Hide admin container
    },

    showUserContainer(user) {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('userContainer').style.display = 'block';
        document.querySelector('.admin-container').style.display = 'block';  // Show admin container
        document.getElementById('userEmail').textContent = `Logged in as: ${security.sanitizeInput(user.email)}`;
    },

    showError(message) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    },

    clearForm() {
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        document.getElementById('error').textContent = '';
    },    
    showInviteStatus(message, isError = false) {
        const statusElement = document.getElementById('inviteStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = isError ? 'error-message' : 'success-message';
            setTimeout(() => {
                statusElement.textContent = '';
            }, 5000);
        }
    }
};

// Session Management
async function checkUser() {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            ui.showUserContainer(session.user)
        } else {
            ui.showAuthContainer()
        }
    } catch (error) {
        console.error('Error checking auth state:', error)
        ui.showAuthContainer()
    }
}

// Authentication Functions
async function signIn() {
    try {
        const email = security.sanitizeInput(document.getElementById('email').value.trim())
        const password = document.getElementById('password').value

        // Input validation
        if (!email || !password) {
            throw new Error('Please fill in all fields')
        }

        // Check rate limiting
        security.checkRateLimit(email)

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            security.trackFailedAttempt(email)
            throw error
        }

        // Success
        ui.clearForm()
        security.clearAttempts(email)

    } catch (error) {
        ui.showError(error.message)
    }
}



async function signUp() {
    try {
        const email = security.sanitizeInput(document.getElementById('email').value.trim())
        const password = document.getElementById('password').value

        // Input validation
        if (!email || !password) {
            throw new Error('Please fill in all fields')
        }

        // Validate password strength
        security.validatePassword(password)

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        })

        if (error) throw error

        // Success
        ui.clearForm()
        ui.showError('Check your email for the confirmation link!')

    } catch (error) {
        ui.showError(error.message)
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        ui.showAuthContainer()
    } catch (error) {
        console.error('Error signing out:', error.message)
        ui.showError('Error signing out. Please try again.')
    }
}

// Session refresh and monitoring
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
        console.log('Session token refreshed')
    }
    if (session) {
        ui.showUserContainer(session.user)
    } else {
        ui.showAuthContainer()
    }
})

// Initialization
checkUser()



// Optional: Log when the script has loaded successfully
console.log('Auth system initialized successfully')


// Admin Page Components
const reviewModal = document.getElementById('reviewModal');
const reviewForm = document.getElementById('reviewForm');
const newReviewBtn = document.getElementById('newReviewBtn');
const modalClose = document.querySelector('.modal-close');
const addSectionBtn = document.getElementById('addSection');
const sectionsList = document.getElementById('sectionsList');

// Initialize the admin page
async function initializeAdmin() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            ui.showAuthContainer();
            return;
        }

        ui.showUserContainer(session.user);

        // Fetch categories
        const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id, category');
        if (categoryError) throw categoryError;

        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            categorySelect.innerHTML = categoryData.map(cat => 
                `<option value="${cat.id}">${security.sanitizeInput(cat.category)}</option>`
            ).join('');
        }

        // Fetch restaurants
        const { data: restaurantData, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id, name')
            .order('name');
        if (restaurantError) throw restaurantError;

        const restaurantSelect = document.getElementById('restaurantId');
        if (restaurantSelect) {
            restaurantSelect.innerHTML = restaurantData.map(restaurant => 
                `<option value="${restaurant.id}">${security.sanitizeInput(restaurant.name)}</option>`
            ).join('');
        }

        // Initialize Sortable
        initializeSortable();

        // Load user's reviews
        await loadUserReviews(session.user.id);

        // Set up event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Initialization error:', error);
        ui.showError('Error initializing admin page. Please try again.');
    }
}

async function loadUserReviews(userId) {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                restaurants!reviews_restaurant_id_fkey (
                    id,
                    cover_image,
                    latitude,
                    longitude,
                    name,
                    category_id
                )
            `)
            .eq('author', userId);

        if (error) throw error;
        
        const categoryMap = await fetchCategories();
        displayReviews(reviews, categoryMap);
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        ui.showError('Error loading reviews. Please try again.');
    }
}




let category_to_id_map = {};

async function fetchCategories() {
    try {
        console.log("Attempting to fetch categories...");
        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<p>No categories found.</p>';
            return;
        }

        // Clear and repopulate the map
        category_to_id_map = {};
        data.forEach((category) => {
            category_to_id_map[category.id] = category.category;  
        });

    } catch (error) {
        console.error('Error in fetchCategories:', error);
        if (container) {
            container.innerHTML = `<p>Error loading categories: ${error.message}</p>`;
        }
    }
}

// Keep this as a regular function, not async
function getCategoryById(categoryMap, targetId) {
    return categoryMap[targetId] || 'Uncategorized';
}

function displayReviews(reviews) {
    try {
        console.log("Starting to display reviews...");
        const reviewList = document.getElementById('reviewList');
        
        reviewList.innerHTML = '';

        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review-card');

            const restaurant = review.restaurants;
            const categoryName = getCategoryById(category_to_id_map, restaurant?.category_id);
            
            // Use review.cover_image if available, otherwise fallback to restaurant.cover_image
            const coverImage = review?.cover_image || restaurant.cover_image || 'No image available';
            
            reviewElement.innerHTML = `
                <div class="edit-review-card-body-container">
                    <div class="review-cover-image"> 
                        <img src="${coverImage}" alt="${restaurant?.name || 'Review image'}">
                    </div>
                    <div class="non-image-review-container"> 
                        <div class="review-text-container"> 
                            <h1>${restaurant?.name || 'Untitled'}</h1>
                            <p><strong>Reviewer:</strong> ${review.author_display_name || 'Anonymous'}</p>
                            <p>${review.summary || 'No summary available'}</p>
                        </div>

                        <div class="right-sidebar">
                            <div class="rating-number-container"> 
                                <h1 id=rating-number>${review.rating}/10</h1>
                            </div>
                            <div class="cuisine-label-container"> 
                                <h1 id=cuisine-label>${categoryName}</h1>
                            </div>
                            <div class="review-actions">
                                <button class="btn edit-button" onclick="editReview('${review.id}')">Edit</button>
                                <button class="btn delete-button" onclick="deleteReview('${review.id}')">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            reviewList.appendChild(reviewElement);
        });

        console.log('Finished displaying reviews');
    } catch (error) {
        console.error('Error in displayReviews:', error);
        const container = document.getElementById('review-list-container');
        if (container) {
            container.innerHTML = `<p>Error displaying reviews: ${error.message}</p>`;
        }
    }
}


function setupEventListeners() {
    const newReviewBtn = document.getElementById('newReviewBtn');
    const modalClose = document.querySelector('.modal-close');
    const addSectionBtn = document.getElementById('addSectionBtn');
    const sectionTypeDropdown = document.getElementById('sectionTypeDropdown');
    
    if (newReviewBtn) {
        newReviewBtn.addEventListener('click', () => showReviewModal());
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', hideReviewModal);
    }
    
    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', toggleSectionDropdown);
    }

    // Event delegation for section type buttons
    if (sectionTypeDropdown) {
        sectionTypeDropdown.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button) {
                const type = button.dataset.sectionType;
                addNewSection(type);
            }
        });
    }
}

// Add this new function to handle form submission
function setupFormListener() {
    const form = document.getElementById('modalReviewForm');
    if (form) {
        form.addEventListener('submit', handleReviewSubmit);
        console.log('Form listener attached');
    } else {
        console.error('Form not found');
    }
}

function showReviewModal(reviewData = null) {
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = reviewData ? 'Edit Review' : 'New Review';
    
    if (reviewData) {
        document.getElementById('reviewId').value = reviewData.id;
        document.getElementById('restaurantId').value = reviewData.restaurant_id;
        document.getElementById('rating').value = reviewData.rating;
        document.getElementById('summary').value = reviewData.summary;
        const sectionDiv = document.getElementById('cover_image_section');
        const contentDiv = document.getElementById('cover_image_content');
        contentDiv.innerHTML = `
                <div class="editor-section-image">
                    <div class="preview-area">
                        ${reviewData?.cover_image ? 
                        `<img src="${security.sanitizeInput(reviewData.cover_image)}" 
                                class="editor-section-image-preview" 
                                alt="Preview">` 
                        : '<div class="placeholder">No image selected</div>'}
                    </div>
                    <div class="controls-area">
                        <input type="file" 
                            class="editor-section-image-file" 
                            accept="image/*"
                            onchange="handleImageUpload(this, '.editor-cover-image-url')">
                        <input type="hidden" 
                            class="editor-cover-image-url" 
                            value="${security.sanitizeInput(reviewData?.cover_image || '')}">
                        <div class="upload-status hidden"></div>
                    </div>
                </div>
            `;
        sectionDiv.appendChild(contentDiv);
        loadReviewSections(reviewData.id);
    } else {
        document.getElementById('modalReviewForm').reset();
        document.getElementById('reviewId').value = '';
        document.getElementById('sectionsList').innerHTML = '';
    }
    
    reviewModal.style.display = 'flex';
    setupFormListener(); 

    initializeSortable();
}

// Hide the review modal
function hideReviewModal() {
    reviewModal.style.display = 'none';
    const form = document.getElementById('modalReviewForm');
    if (form) {
        form.reset();
    }
    // Clear sections list
    const sectionsList = document.getElementById('sectionsList');
    if (sectionsList) {
        sectionsList.innerHTML = '';
    }
    // Clear the review ID
    const reviewIdInput = document.getElementById('reviewId');
    if (reviewIdInput) {
        reviewIdInput.value = '';
    }
}

// Add this to your event listeners setup
document.getElementById('addSectionBtn').addEventListener('click', toggleSectionDropdown);

// Add these new functions
function toggleSectionDropdown() {
    const dropdown = document.getElementById('sectionTypeDropdown');
    dropdown.classList.toggle('hidden');
}

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.editor-add-section')) {
        document.getElementById('sectionTypeDropdown').classList.add('hidden');
    }
});

async function uploadImage(file, bucket = 'review-images') {
    try {
        if (!file) return null;
        
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { data, error } = await supabase
            .storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase
            .storage
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        throw error;
    }
}

function addNewSection(type, sectionData = null) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'editor-section';
    
    // Create drag handle
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⠿⠿⠿';
    sectionDiv.appendChild(dragHandle);
    
    // Create content container
    const contentDiv = document.createElement('div');
    
    switch(type) {
        case 'heading':
            contentDiv.innerHTML = `
                <button type="button" class="editor-section-remove" onclick="removeSection(this)">×</button>
                <input type="text" 
                       class="editor-section-heading" 
                       placeholder="Enter heading..."
                       value="${security.sanitizeInput(sectionData?.heading || '')}">
            `;
            break;
            
        case 'text':
            contentDiv.innerHTML = `
                <button type="button" class="editor-section-remove" onclick="removeSection(this)">×</button>
                <div class="editor-section-content">
                    <div class="quill-editor"></div>
                    <input type="hidden" class="quill-content">
                </div>
            `;
            break;
            
        case 'image':
            contentDiv.innerHTML = `
                <button type="button" class="editor-section-remove" onclick="removeSection(this)">×</button>
                <div class="editor-section-image">
                    <div class="preview-area">
                        ${sectionData?.image_url ? 
                          `<img src="${security.sanitizeInput(sectionData.image_url)}" 
                                class="editor-section-image-preview" 
                                alt="Preview">` 
                          : '<div class="placeholder">No image selected</div>'}
                    </div>
                    <div class="controls-area">
                        <input type="file" 
                               class="editor-section-image-file" 
                               accept="image/*"
                               onchange="handleImageUpload(this)">
                        <input type="hidden" 
                               class="editor-section-image-url" 
                               value="${security.sanitizeInput(sectionData?.image_url || '')}">
                        <div class="upload-status hidden"></div>
                    </div>
                </div>
            `;
            break;
    }
    
    sectionDiv.appendChild(contentDiv);
    document.getElementById('sectionsList').appendChild(sectionDiv);
    
    if (type === 'text') {
        const editor = new Quill(sectionDiv.querySelector('.quill-editor'), {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                ]
            }
        });
        
        if (sectionData?.text) {
            editor.root.innerHTML = sectionData.text;
        }
    }
    
    document.getElementById('sectionTypeDropdown').classList.add('hidden');
}

async function handleImageUpload(input, url_bucket = '.editor-section-image-url') {
    const section = input.closest('.editor-section');
    if (!section) return;

    const previewArea = section.querySelector('.preview-area');
    const urlInput = section.querySelector(url_bucket); // Default to section image URL input
    const status = section.querySelector('.upload-status');
    
    if (!previewArea || !urlInput || !status) return;
    
    try {
        if (!input.files || !input.files[0]) return;
        
        status.textContent = 'Uploading...';
        status.classList.remove('hidden');
        
        const publicUrl = await uploadImage(input.files[0]);
        urlInput.value = publicUrl;
        
        previewArea.innerHTML = `
            <img src="${security.sanitizeInput(publicUrl)}" 
                 class="editor-section-image-preview" 
                 alt="Preview">
        `;
        
        status.classList.add('hidden');
        
    } catch (error) {
        status.textContent = 'Upload failed. Please try again.';
    }
}


// Remove a section from the form
function removeSection(button) {
    button.closest('.editor-section').remove();
}

function previewImage(input) {
    const section = input.closest('.editor-section');
    let preview = section.querySelector('.editor-section-image-preview');
    
    if (input.value) {
        if (!preview) {
            preview = document.createElement('img');
            preview.className = 'editor-section-image-preview';
            input.parentNode.insertBefore(preview, input.nextSibling);
        }
        preview.src = input.value;
    } else if (preview) {
        preview.remove();
    }
}

async function loadReviewSections(reviewId) {
    try {
        const { data: sections, error } = await supabase
            .from('sections')
            .select('*')
            .eq('review_id', reviewId)
            .order('order');

        if (error) throw error;

        sectionsList.innerHTML = '';
        
        sections.forEach(section => {
            let type;
            if (section.heading !== null) type = 'heading';
            else if (section.text !== null) type = 'text';
            else if (section.image_url !== null) type = 'image';
            
            if (type) {
                addNewSection(type, section);
            }
        });
        
        // Reinitialize sortable after loading sections
        initializeSortable();
    } catch (error) {
        console.error('Error loading sections:', error);
        ui.showError('Error loading review sections. Please try again.');
    }
}

// Edit review
async function editReview(reviewId) {
    try {
        console.log('Editing review:', reviewId);
        
        const { data: review, error } = await supabase
            .from('reviews')
            .select(`
                *,
                restaurants (
                    id,
                    name
                )
            `)
            .eq('id', reviewId)
            .single();

        if (error) throw error;
        
        console.log('Retrieved review data:', review);

        showReviewModal(review);
        
        // Load sections for this review
        await loadReviewSections(reviewId);
    } catch (error) {
        console.error('Error loading review:', error);
        ui.showError('Error loading review. Please try again.');
    }
}

async function deleteReview(reviewId) {
    if (!reviewId) {
        console.error('Invalid review ID');
        return;
    }

    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        console.log('Starting deletion process for review:', reviewId);
        
        // Get the current user's session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session');
        }
        
        console.log('Current user:', session.user.id);
        
        // Check if review exists and belongs to current user
        const { data: review, error: checkError } = await supabase
            .from('reviews')
            .select('*')
            .eq('id', reviewId)
            .eq('author', session.user.id)
            .single();

        if (checkError) {
            console.error('Check error:', checkError);
            throw new Error('Review not found or permission denied');
        }

        if (!review) {
            throw new Error('Review not found');
        }

        console.log('Found review to delete:', review);

        // Delete related sections first
        const { data: deletedSections, error: sectionsError } = await supabase
            .from('sections')
            .delete()
            .eq('review_id', reviewId)
            .select();

        if (sectionsError) {
            console.error('Error deleting sections:', sectionsError);
            throw new Error('Failed to delete review sections');
        }

        console.log('Deleted sections:', deletedSections);

        // Delete the review with explicit author check
        const { data: deletedReview, error: deleteError } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId)
            .eq('author', session.user.id)  // Ensure we're only deleting user's own review
            .select();

        if (deleteError) {
            console.error('Delete error:', deleteError);
            throw new Error(`Failed to delete review: ${deleteError.message}`);
        }

        if (!deletedReview || deletedReview.length === 0) {
            throw new Error('Review could not be deleted - no rows affected');
        }

        console.log('Successfully deleted review:', deletedReview);

        // Reload the reviews list
        await loadUserReviews(session.user.id);

        console.log('Delete process completed successfully');

    } catch (error) {
        console.error('Error in deleteReview:', error);
        ui.showError(error.message || 'Error deleting review. Please try again.');
    }}

async function handleReviewSubmit(event) {
    event.preventDefault();
    
    try {
        // Get the basic review data
        const reviewId = document.getElementById('reviewId').value;
        const restaurantId = document.getElementById('restaurantId').value;
        const rating = parseFloat(document.getElementById('rating').value);
        const summary = security.sanitizeInput(document.getElementById('summary').value.trim());

        // Check session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session found');
        }

        let cover_image_url = null;
        // Handle cover image
        const imageUrlInput = document.querySelector('.editor-cover-image-url');
        if (imageUrlInput) {
            cover_image_url = security.sanitizeInput(imageUrlInput.value.trim());
        }
        console.log('Cover image url to save', cover_image_url);

        // Create review data with all required fields
        const reviewData = {
            restaurant_id: restaurantId,
            rating,
            summary,
            author: session.user.id,
            publish_date: new Date().toISOString(),
            tags: [],
            plusses: [],
            minuses: [],
            title: summary.substring(0, 100),
            cover_image: cover_image_url
        };

        console.log('Saving review with data:', reviewData);

        let result;
        if (reviewId) {
            // Update existing review
            result = await supabase
                .from('reviews')
                .update(reviewData)
                .eq('id', reviewId)
                .select('id')
                .single();
        } else {
            // Insert new review and return the ID
            result = await supabase
                .from('reviews')
                .insert(reviewData)
                .select('id')
                .single();
        }

        console.log('Supabase result:', result);

        if (result.error) {
            throw result.error;
        }

        if (!result.data) {
            throw new Error('No data returned from save operation');
        }

        const savedReviewId = result.data.id;
        if (!savedReviewId) {
            throw new Error('No review ID in response data');
        }

        console.log('Saved review ID:', savedReviewId);

        // Handle sections
        if (reviewId) {
            // Delete existing sections if updating
            const { error: deleteError } = await supabase
                .from('sections')
                .delete()
                .eq('review_id', reviewId);
            if (deleteError) throw deleteError;
        }

        const sections = Array.from(document.querySelectorAll('.editor-section'))
        .map((section, index) => {
            const baseSection = {
                review_id: savedReviewId,
                order: index,
                heading: null,
                text: null,
                image_url: null
            };
            
            // Find heading input
            const headingInput = section.querySelector('.editor-section-heading');
            if (headingInput) {
                baseSection.heading = security.sanitizeInput(headingInput.value.trim());
            }
            
            // Find Quill editor
            const quillContainer = section.querySelector('.quill-editor');
            if (quillContainer) {
                const quillEditor = Quill.find(quillContainer);
                if (quillEditor) {
                    baseSection.text = quillEditor.root.innerHTML;
                }
            }
            
            // Find image URL
            const imageUrlInput = section.querySelector('.editor-section-image-url');
            if (imageUrlInput) {
                baseSection.image_url = security.sanitizeInput(imageUrlInput.value.trim());
            }
            
            return baseSection;
        })
        .filter(section => section.heading || section.text || section.image_url);

        // Insert new sections if any exist
        if (sections.length > 0) {
            const { error: sectionsError } = await supabase
                .from('sections')
                .insert(sections);
            if (sectionsError) throw sectionsError;
        }

        // Reload reviews and hide modal
        await loadUserReviews(session.user.id);
        hideReviewModal();
    } catch (error) {
        console.error('Error saving review:', error);
        ui.showError(`Error saving review: ${error.message || 'Unknown error occurred'}`);
    }
}

// Restaurant Modal UI Elements
const restaurantModal = document.getElementById('restaurantModal');
const restaurantForm = document.getElementById('restaurantForm');
const newRestaurantBtn = document.getElementById('newRestaurantBtn');
const modalCloseRestaurant = document.querySelector('.modal-close-restaurant');

// Show the restaurant modal
async function showRestaurantModal(restaurantData = null) {
    const form = document.getElementById('modalRestaurantForm');
    if (form) form.reset();
    
    document.getElementById('restaurantId').value = '';
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    
    const previewArea = document.getElementById('imagePreview');
    if (previewArea) {
        previewArea.innerHTML = '<div class="placeholder">No image selected</div>';
    }
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('category');

        if (error) throw error;

        const categorySelect = document.getElementById('restaurantCategory');
        if (categorySelect) {
            categorySelect.innerHTML = `
                <option value="">Select Category</option>
                ${categories.map(cat => 
                    `<option value="${cat.id}">${security.sanitizeInput(cat.category)}</option>`
                ).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        ui.showError('Error loading categories. Please try again.');
    }
    
    restaurantModal.style.display = 'flex';
}

// Hide the restaurant modal
function hideRestaurantModal() {
    const modal = document.getElementById('restaurantModal');
    const form = document.getElementById('modalRestaurantForm');
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
    
    // Reset preview
    const previewArea = document.getElementById('imagePreview');
    if (previewArea) {
        previewArea.innerHTML = '<div class="placeholder">No image selected</div>';
    }
}

// Handle image upload and preview
function handleRestaurantImageUpload(input) {
    const section = input.closest('.editor-section');
    const previewArea = section.querySelector('.preview-area');
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewArea.innerHTML = `<img src="${e.target.result}" class="editor-section-image-preview" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Look up address coordinates using OpenStreetMap's Nominatim API
async function lookupAddress() {
    const address = document.getElementById('address').value.trim();
    const statusElement = document.getElementById('addressStatus');
    
    if (!address) {
        statusElement.textContent = 'Please enter an address';
        return;
    }
    
    try {
        statusElement.textContent = 'Looking up address...';
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await response.json();
        
        if (data && data[0]) {
            document.getElementById('latitude').value = data[0].lat;
            document.getElementById('longitude').value = data[0].lon;
            statusElement.textContent = 'Address found!';
            setTimeout(() => {
                statusElement.textContent = '';
            }, 2000);
        } else {
            statusElement.textContent = 'Address not found';
        }
    } catch (error) {
        console.error('Error looking up address:', error);
        statusElement.textContent = 'Error looking up address';
    }
}

// Handle form submission
async function handleRestaurantSubmit(event) {
    event.preventDefault();
    
    try {
        const name = security.sanitizeInput(document.getElementById('restaurantName').value.trim());
        const categoryId = document.getElementById('restaurantCategory').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const displayAddress = security.sanitizeInput(document.getElementById('address').value.trim());
        const imageInput = document.getElementById('restaurantImage');
        
        // Validate required fields
        if (!name || !categoryId || !displayAddress) {
            throw new Error('Please fill in all required fields');
        }
        
        // Handle image upload if there's a new image
        let imageUrl = '';
        if (imageInput.files && imageInput.files[0]) {
            imageUrl = await uploadImage(imageInput.files[0], 'review-images');
        }
        
        // Create restaurant data object
        const restaurantData = {
            name,
            category_id: categoryId,
            latitude: latitude || null,
            longitude: longitude || null,
            address: displayAddress, // Add the display address
            cover_image: imageUrl
        };
        
        // For now, only handle new restaurant creation
        const result = await supabase
            .from('restaurants')
            .insert([restaurantData])
            .select();
            
        if (result.error) throw result.error;
        
        // Hide modal and reset form
        hideRestaurantModal();
        
    } catch (error) {
        console.error('Error saving restaurant:', error);
        ui.showError(`Error saving restaurant: ${error.message}`);
    }
}

function displayAddressResults(results) {
    const dropdown = document.getElementById('addressDropdown');
    
    if (!results.length) {
        dropdown.classList.add('hidden');
        return;
    }
    
    dropdown.innerHTML = results
        .slice(0, 5) // Limit to 5 results
        .map(result => {
            const displayName = security.sanitizeInput(result.display_name);
            // Try to extract a reasonable street address format
            const addressParts = displayName.split(',');
            let streetAddress = '';
            
            // Look for parts that contain street numbers
            for (const part of addressParts) {
                const trimmedPart = part.trim();
                if (/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Place|Pl|Way|Square|Sq)\b/i.test(trimmedPart)) {
                    streetAddress = trimmedPart;
                    break;
                }
            }
            
            // If no street address found, use first part
            if (!streetAddress) {
                streetAddress = addressParts[0].trim();
            }
            
            return `
                <div class="address-option" 
                     data-lat="${result.lat}" 
                     data-lon="${result.lon}"
                     data-name="${streetAddress}"
                     data-full-name="${displayName}">
                    <div class="suggested-address">${streetAddress}</div>
                    <div class="full-address text-sm text-gray-500">${displayName}</div>
                </div>
            `;
        })
        .join('');
    
    dropdown.classList.remove('hidden');
    
    // Add click handlers to options
    dropdown.querySelectorAll('.address-option').forEach(option => {
        option.addEventListener('click', () => {
            const lat = option.dataset.lat;
            const lon = option.dataset.lon;
            const name = option.dataset.name;
            
            // Update form fields
            document.getElementById('address').value = name;
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lon;
            
            // Add edit message
            const addressHelp = document.getElementById('addressHelp');
            if (addressHelp) {
                addressHelp.textContent = 'You can edit the address format if needed';
                addressHelp.classList.remove('hidden');
            }
            
            // Hide dropdown
            dropdown.classList.add('hidden');
        });
    });
}

// Set up event listeners
function setupRestaurantEventListeners() {
    const newRestaurantBtn = document.getElementById('newRestaurantBtn');
    const modalClose = document.querySelector('#restaurantModal .modal-close');
    const restaurantForm = document.getElementById('modalRestaurantForm');
    
    if (newRestaurantBtn) {
        newRestaurantBtn.addEventListener('click', () => showRestaurantModal());
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', hideRestaurantModal);
    }
    
    if (restaurantForm) {
        restaurantForm.addEventListener('submit', handleRestaurantSubmit);
    }

    // Set up address autocomplete
    setupAddressAutocomplete();
}

let addressTimeout = null;

// Set up address autocomplete
function setupAddressAutocomplete() {
    const addressInput = document.getElementById('address');
    const dropdown = document.getElementById('addressDropdown');
    
    // Add help text element if it doesn't exist
    if (!document.getElementById('addressHelp')) {
        const helpText = document.createElement('div');
        helpText.id = 'addressHelp';
        helpText.className = 'text-sm text-gray-500 mt-1 hidden';
        addressInput.parentNode.insertBefore(helpText, addressInput.nextSibling);
    }

    addressInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear existing timeout
        if (addressTimeout) {
            clearTimeout(addressTimeout);
        }
        
        // Hide dropdown if input is empty
        if (!query) {
            dropdown.classList.add('hidden');
            return;
        }
        
        // Debounce the search
        addressTimeout = setTimeout(async () => {
            try {
                // Call OpenStreetMap API
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
                );
                const results = await response.json();
                
                // Display results
                displayAddressResults(results);
            } catch (error) {
                console.error('Error fetching addresses:', error);
            }
        }, 300); // Wait 300ms after user stops typing
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!addressInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
    
    // Show dropdown when focusing on input if it has value
    addressInput.addEventListener('focus', () => {
        if (addressInput.value.trim()) {
            dropdown.classList.remove('hidden');
        }
    });
}


document.querySelectorAll('.editor-section-content').forEach((textarea) => {
    textarea.style.height = 'auto'; // Reset height to auto
    textarea.style.height = `${textarea.scrollHeight}px`; // Set height based on content

    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto'; // Reset height to auto for recalculating
        textarea.style.height = `${textarea.scrollHeight}px`; // Set height to fit content
    });
});


function initializeSortable() {
    const sectionsList = document.getElementById('sectionsList');
    if (sectionsList) {
        if (sectionsSortable) {
            sectionsSortable.destroy(); // Destroy existing instance if it exists
        }
        
        sectionsSortable = new Sortable(sectionsList, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                console.log('Drag ended, reinitializing content...');
                // Reinitialize Quill editor in the moved section if it exists
                const movedSection = evt.item;
                const quillContainer = movedSection.querySelector('.quill-editor');
                if (quillContainer) {
                    // Store the content before destroying
                    let content = '';
                    const existingEditor = Quill.find(quillContainer);
                    if (existingEditor) {
                        content = existingEditor.root.innerHTML;
                        // Remove the editor's wrapper element
                        const editorWrapper = quillContainer.querySelector('.ql-container');
                        if (editorWrapper) {
                            editorWrapper.remove();
                        }
                        // Remove toolbar
                        const toolbar = quillContainer.querySelector('.ql-toolbar');
                        if (toolbar) {
                            toolbar.remove();
                        }
                    }
                    
                    console.log('Reinitializing Quill editor...');
                    const editor = new Quill(quillContainer, {
                        theme: 'snow',
                        modules: {
                            toolbar: [
                                ['bold', 'italic', 'underline'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                ['link'],
                                ['clean']
                            ]
                        }
                    });
                    
                    // Restore the content
                    if (content) {
                        editor.root.innerHTML = content;
                    } else {
                        // Fallback to hidden input if available
                        const contentInput = movedSection.querySelector('.quill-content');
                        if (contentInput && contentInput.value) {
                            editor.root.innerHTML = contentInput.value;
                        }
                    }
                }
            }
        });
    }
}

// Make functions globally available
window.signIn = signIn;
window.sendInvite = sendInvite;
window.signOut = signOut;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.removeSection = removeSection;
window.handleImageUpload = handleImageUpload;
window.uploadImage = uploadImage;
window.showRestaurantModal = showRestaurantModal;
window.hideRestaurantModal = hideRestaurantModal;
window.handleRestaurantImageUpload = handleRestaurantImageUpload;
window.lookupAddress = lookupAddress;



// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAdmin);
document.addEventListener('DOMContentLoaded', setupRestaurantEventListeners);
document.addEventListener('DOMContentLoaded', () => {
    setupAddressAutocomplete();
});

const testNewFunction = async (email) => {
    try {
        const { data, error } = await supabase
            .rpc('send_invite', {
                email_to_invite: email
            });
        console.log('New function test:', { data, error });
    } catch (err) {
        console.error('New function error:', err);
    }
};

// Test it
testNewFunction('test@example.com');