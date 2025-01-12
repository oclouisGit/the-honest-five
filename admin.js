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

// UI Management
const ui = {
    showAuthContainer() {
        document.getElementById('authContainer').style.display = 'block'
        document.getElementById('userContainer').style.display = 'none'
    },

    showUserContainer(user) {
        document.getElementById('authContainer').style.display = 'none'
        document.getElementById('userContainer').style.display = 'block'
        document.getElementById('userEmail').textContent = `Logged in as: ${security.sanitizeInput(user.email)}`
    },

    showError(message) {
        const errorElement = document.getElementById('error')
        errorElement.textContent = message
        errorElement.style.display = 'block'
    },

    clearForm() {
        document.getElementById('email').value = ''
        document.getElementById('password').value = ''
        document.getElementById('error').textContent = ''
    }
}

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