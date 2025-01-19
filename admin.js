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
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Show auth container instead of redirecting
            ui.showAuthContainer();
            return;
        }

        ui.showUserContainer(session.user);

        const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id, category');
        if (categoryError) throw categoryError;

        // Populate category dropdown
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = categoryData.map(cat => 
            `<option value="${cat.id}">${security.sanitizeInput(cat.category)}</option>`
        ).join('');

        // Fetch restaurants
        const { data: restaurantData, error: restaurantError } = await supabase
            .from('restaurants')
            .select('id, name')
            .order('name');
        if (restaurantError) throw restaurantError;

        // Populate restaurant dropdown
        const restaurantSelect = document.getElementById('restaurantId');
        restaurantSelect.innerHTML = restaurantData.map(restaurant => 
            `<option value="${restaurant.id}">${security.sanitizeInput(restaurant.name)}</option>`
        ).join('');

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

// Set up event listeners
function setupEventListeners() {
    newReviewBtn.addEventListener('click', () => showReviewModal());
    modalClose.addEventListener('click', () => hideReviewModal());
    addSectionBtn.addEventListener('click', addNewSection);
    reviewForm.addEventListener('submit', handleReviewSubmit);
}

function showReviewModal(reviewData = null) {
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = reviewData ? 'Edit Review' : 'New Review';
    
    if (reviewData) {
        // Populate form with review data
        document.getElementById('reviewId').value = reviewData.id;
        document.getElementById('restaurantId').value = reviewData.restaurant_id;
        document.getElementById('rating').value = reviewData.rating;
        document.getElementById('category').value = reviewData.category_id;
        document.getElementById('summary').value = reviewData.summary;
        
        // Load sections
        loadReviewSections(reviewData.id);
    } else {
        // Clear form for new review
        reviewForm.reset();
        document.getElementById('reviewId').value = '';
        sectionsList.innerHTML = '';
        addNewSection(); // Add one empty section by default
    }
    
    reviewModal.style.display = 'flex';
}

// Hide the review modal
function hideReviewModal() {
    reviewModal.style.display = 'none';
    reviewForm.reset();
}

// Add a new section to the form
function addNewSection(sectionData = null) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section-item';
    sectionDiv.innerHTML = `
        <div class="form-group">
            <label>Section Heading</label>
            <input type="text" class="form-input section-heading" value="${security.sanitizeInput(sectionData?.heading || '')}">
        </div>
        <div class="form-group">
            <label>Image URL</label>
            <input type="url" class="form-input section-image" value="${security.sanitizeInput(sectionData?.image_url || '')}">
        </div>
        <div class="form-group">
            <label>Content</label>
            <textarea class="form-textarea section-content">${security.sanitizeInput(sectionData?.text || '')}</textarea>
        </div>
        <button type="button" class="btn btn-danger" onclick="removeSection(this)">Remove Section</button>
    `;
    sectionsList.appendChild(sectionDiv);
}

// Remove a section from the form
function removeSection(button) {
    button.closest('.section-item').remove();
}

// Load sections for a review
async function loadReviewSections(reviewId) {
    try {
        const { data: sections, error } = await supabase
            .from('sections')  // Changed from review_sections
            .select('*')
            .eq('review_id', reviewId)
            .order('order');

        if (error) throw error;

        sectionsList.innerHTML = '';
        sections.forEach(section => addNewSection(section));
    } catch (error) {
        console.error('Error loading sections:', error);
        ui.showError('Error loading review sections. Please try again.');
    }
}

// Edit review
async function editReview(reviewId) {
    try {
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

        showReviewModal(review);
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

// Handle form submission
async function handleReviewSubmit(event) {
    event.preventDefault();
    
    try {
        const reviewId = document.getElementById('reviewId').value;
        const restaurantId = document.getElementById('restaurantId').value;
        const rating = parseFloat(document.getElementById('rating').value);
        const categoryId = document.getElementById('category').value;
        const summary = security.sanitizeInput(document.getElementById('summary').value.trim());

        // Log the data we're about to submit
        console.log('Submitting review data:', {
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

        console.log('Review data being sent to Supabase:', reviewData);

        let result;
        if (reviewId) {
            // Update existing review
            result = await supabase
                .from('reviews')
                .update(reviewData)
                .eq('id', reviewId);
            console.log('Update result:', result);
        } else {
            // Create new review
            result = await supabase
                .from('reviews')
                .insert([reviewData]);
            console.log('Insert result:', result);
        }

        if (result.error) {
            throw result.error;
        }

        // Get the review ID (either existing or new)
        const savedReviewId = reviewId || result.data?.[0]?.id;
        if (!savedReviewId) {
            throw new Error('Failed to get review ID after save');
        }

        // Handle sections
        console.log('Processing sections...');
        const sections = Array.from(document.querySelectorAll('.section-item')).map((section, index) => ({
            review_id: savedReviewId,
            heading: security.sanitizeInput(section.querySelector('.section-heading').value.trim()),
            text: security.sanitizeInput(section.querySelector('.section-content').value.trim()),
            image_url: security.sanitizeInput(section.querySelector('.section-image').value.trim()),
            order: index
        }));

        console.log('Section data:', sections);

        // Delete existing sections if updating
        if (reviewId) {
            const { error: deleteError } = await supabase
                .from('sections')  // Changed from review_sections
                .delete()
                .eq('review_id', reviewId);
            if (deleteError) {
                console.error('Error deleting sections:', deleteError);
                throw deleteError;
            }
        }

        // Insert new sections
        if (sections.length > 0) {
            const { error: sectionsError } = await supabase
                .from('sections')  // Changed from review_sections
                .insert(sections);
            if (sectionsError) {
                console.error('Error inserting sections:', sectionsError);
                throw sectionsError;
            }
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
