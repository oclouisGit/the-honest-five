import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm';

const supabaseUrl = 'https://ecsqqzuguvdrhlqsbjci.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3FxenVndXZkcmhscXNiamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NDc2NjQsImV4cCI6MjA0NzEyMzY2NH0.GOWZP1KYpl_tAGjH2FL_16UPkkcpyQB17tWQnDbzBik'

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

// Make functions available globally (needed for HTML onclick handlers)
window.signIn = signIn
window.signUp = signUp
window.signOut = signOut

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
                restaurants (
                    id,
                    name
                ),
                categories (
                    id,
                    category
                )
            `)
            .eq('author', userId);

        if (error) throw error;

        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-info">
                    <h2>${security.sanitizeInput(review.restaurants?.name || 'Unnamed Restaurant')}</h2>
                    <div class="review-meta">
                        <span>Rating: ${review.rating}/10</span>
                        <span>Category: ${security.sanitizeInput(review.categories?.category || 'Uncategorized')}</span>
                    </div>
                    <p>${'Summary: ' + security.sanitizeInput(review.summary)}</p>
                </div>
                <div class="review-actions">
                    <button class="btn btn-secondary" onclick="editReview('${review.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteReview('${review.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reviews:', error);
        ui.showError('Error loading reviews. Please try again.');
    }
}

function setupEventListeners() {
    const newReviewBtn = document.getElementById('newReviewBtn');
    const modalClose = document.querySelector('.modal-close');
    const addSectionBtn = document.getElementById('addSectionBtn');
    
    if (newReviewBtn) {
        newReviewBtn.addEventListener('click', () => showReviewModal());
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', hideReviewModal);
    }
    
    if (addSectionBtn) {
        addSectionBtn.addEventListener('click', toggleSectionDropdown);
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
        document.getElementById('category').value = reviewData.category_id;
        document.getElementById('summary').value = reviewData.summary;
        
        loadReviewSections(reviewData.id);
    } else {
        document.getElementById('modalReviewForm').reset();
        document.getElementById('reviewId').value = '';
        document.getElementById('sectionsList').innerHTML = '';
    }
    
    reviewModal.style.display = 'flex';
    setupFormListener(); // Add this line to set up the form listener
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

// Replace your old addNewSection function with this new one
function addNewSection(type, sectionData = null) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'editor-section';
    
    let sectionContent = '';
    
    switch(type) {
        case 'heading':
            sectionContent = `
                <button type="button" class="editor-section-remove" onclick="removeSection(this)">×</button>
                <input type="text" 
                       class="editor-section-heading" 
                       placeholder="Enter heading..."
                       value="${security.sanitizeInput(sectionData?.heading || '')}">
            `;
            break;
            
        case 'image':
            sectionContent = `
                <button type="button" class="editor-section-remove" onclick="removeSection(this)">×</button>
                <div class="editor-section-image">
                    <input type="url" 
                           class="editor-section-image-url" 
                           placeholder="Image URL"
                           value="${security.sanitizeInput(sectionData?.image_url || '')}"
                           onchange="previewImage(this)">
                    ${sectionData?.image_url ? 
                      `<img src="${security.sanitizeInput(sectionData.image_url)}" 
                            class="editor-section-image-preview" 
                            alt="Section image">` 
                      : ''}
                </div>
            `;
            break;
            
        case 'text':
            sectionContent = `
                <button type="button" class="editor-section-remove" onclick="removeSection(this)">×</button>
                <textarea class="editor-section-content" 
                          placeholder="Write your content here...">${security.sanitizeInput(sectionData?.text || '')}</textarea>
            `;
            break;
    }
    
    sectionDiv.innerHTML = sectionContent;
    sectionDiv.dataset.sectionType = type;
    
    document.getElementById('sectionsList').appendChild(sectionDiv);
    document.getElementById('sectionTypeDropdown').classList.add('hidden');
}

// Remove a section from the form
function removeSection(button) {
    button.closest('.section-item').remove();
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
            if (section.heading) {
                addNewSection('heading', section);
            }
            if (section.image_url) {
                addNewSection('image', section);
            }
            if (section.text) {
                addNewSection('text', section);
            }
        });
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

// Delete review
async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (error) throw error;

        // Reload reviews list
        const { data: { session } } = await supabase.auth.getSession();
        await loadUserReviews(session.user.id);
    } catch (error) {
        console.error('Error deleting review:', error);
        ui.showError('Error deleting review. Please try again.');
    }
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    
    try {
        const reviewId = document.getElementById('reviewId').value;
        const restaurantId = document.getElementById('restaurantId').value;
        const rating = parseFloat(document.getElementById('rating').value);
        const categoryId = document.getElementById('category').value;
        const summary = security.sanitizeInput(document.getElementById('summary').value.trim());

        console.log('Form data:', {
            reviewId,
            restaurantId,
            rating,
            categoryId,
            summary
        });

        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('No active session found');
        }

        // Create review data object
        const reviewData = {
            restaurant_id: restaurantId,
            rating,
            category_id: categoryId,
            summary,
            author: session.user.id
        };

        console.log('Review data being sent:', reviewData);

        let result;
        if (reviewId) {
            console.log('Updating existing review:', reviewId);
            result = await supabase
                .from('reviews')
                .update(reviewData)
                .eq('id', reviewId)
                .select();  // Add .select() to get the updated data
        } else {
            console.log('Creating new review');
            result = await supabase
                .from('reviews')
                .insert([reviewData])
                .select();  // Add .select() to get the inserted data
        }

        console.log('Supabase result:', result);

        if (result.error) throw result.error;

        const savedReviewId = reviewId || result.data?.[0]?.id;
        if (!savedReviewId) {
            throw new Error('Failed to get review ID after save');
        }

        console.log('Processing sections for review:', savedReviewId);

        // Handle sections
        const sections = Array.from(document.querySelectorAll('.editor-section'))
            .map((section, index) => {
                const type = section.dataset.sectionType;
                const baseSection = {
                    review_id: savedReviewId,
                    order: index,
                    heading: '',
                    text: '',
                    image_url: ''
                };
                
                switch(type) {
                    case 'heading':
                        baseSection.heading = security.sanitizeInput(
                            section.querySelector('.editor-section-heading').value.trim()
                        );
                        break;
                        
                    case 'image':
                        baseSection.image_url = security.sanitizeInput(
                            section.querySelector('.editor-section-image-url').value.trim()
                        );
                        break;
                        
                    case 'text':
                        baseSection.text = security.sanitizeInput(
                            section.querySelector('.editor-section-content').value.trim()
                        );
                        break;
                }
                
                return baseSection;
            });

        console.log('Sections to save:', sections);

        // Delete existing sections if updating
        if (reviewId) {
            console.log('Deleting old sections');
            const { error: deleteError } = await supabase
                .from('sections')
                .delete()
                .eq('review_id', reviewId);
            if (deleteError) throw deleteError;
        }

        // Insert new sections
        if (sections.length > 0) {
            console.log('Inserting new sections');
            const { error: sectionsError } = await supabase
                .from('sections')
                .insert(sections);
            if (sectionsError) throw sectionsError;
        }

        // Reload reviews and hide modal
        await loadUserReviews(session.user.id);
        hideReviewModal();
    } catch (error) {
        console.error('Detailed error:', error);
        ui.showError(`Error saving review: ${error.message || 'Unknown error occurred'}`);
    }
}

// Make functions globally available
window.signIn = signIn;
window.signUp = signUp;
window.signOut = signOut;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.removeSection = removeSection;


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeAdmin);
