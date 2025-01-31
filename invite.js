import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm';

const supabaseUrl = 'https://ecsqqzuguvdrhlqsbjci.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjc3FxenVndXZkcmhscXNiamNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NDc2NjQsImV4cCI6MjA0NzEyMzY2NH0.GOWZP1KYpl_tAGjH2FL_16UPkkcpyQB17tWQnDbzBik'

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Security utilities
const security = {
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
    }
}

// UI utilities
const ui = {
    showError(message, isSuccess = false) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        errorElement.className = isSuccess ? 'success-message' : 'error';
        errorElement.style.display = 'block';
    },

    clearError() {
        const errorElement = document.getElementById('error');
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('inviteForm');
    const emailInput = document.getElementById('email');
    const submitButton = document.getElementById('submitButton');

    try {
        // Get token from URL parameters
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const type = params.get('type');

        if (!token || type !== 'invite') {
            throw new Error('Invalid or expired invite link');
        }

        // Verify the token by trying to exchange it
        const { data: { user }, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite'
        });

        if (verifyError) throw verifyError;

        // If we have a user, show their email
        if (user?.email) {
            emailInput.value = user.email;
        }

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            ui.clearError();

            try {
                const password = document.getElementById('password').value;

                // Validate password
                security.validatePassword(password);

                // Update user password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });

                if (updateError) throw updateError;

                // Show success and redirect
                ui.showError('Password set successfully! Redirecting...', true);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } catch (error) {
                ui.showError(error.message);
                submitButton.disabled = false;
            }
        });

    } catch (error) {
        console.error('Setup error:', error);
        ui.showError('Invalid or expired invite link. Please request a new invitation.');
        form.style.display = 'none';
    }
});