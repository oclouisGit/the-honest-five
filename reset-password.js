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
    }
};

// UI utilities
const ui = {
    showError(message, isSuccess = false) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.className = isSuccess ? 'success-message' : 'error';
            errorElement.style.display = 'block';
        }
    },

    clearError() {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    },

    updateEmailInput(email) {
        const emailInput = document.getElementById('email');
        if (emailInput && email) {
            emailInput.value = email;
        } else {
            console.warn('Email input not found or email is empty');
        }
    },

    setupFormForType(type) {
        const formTitle = document.getElementById('formTitle');
        const displayNameGroup = document.getElementById('displayNameGroup');
        const submitButton = document.getElementById('submitButton');
        const displayNameInput = document.getElementById('displayName');

        if (type === 'invite') {
            formTitle.textContent = 'Complete Your Profile';
            displayNameGroup.style.display = 'block';
            displayNameInput.required = true;
            submitButton.textContent = 'Complete Registration';
        } else if (type === 'recovery') {
            formTitle.textContent = 'Reset Your Password';
            displayNameGroup.style.display = 'none';
            displayNameInput.required = false;
            submitButton.textContent = 'Reset Password';
        }
    }
};

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Get form elements
    const form = document.getElementById('inviteForm');
    const submitButton = document.getElementById('submitButton');

    if (!form || !submitButton) {
        console.error('Required form elements not found');
        ui.showError('Error loading form elements. Please refresh the page.');
        return;
    }

    try {
        // Set up auth state change listener
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session);
            if (session?.user?.email) {
                ui.updateEmailInput(session.user.email);
            }
        });

        // Get hash parameters from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('type');

        if (!accessToken || !['invite', 'recovery'].includes(tokenType)) {
            throw new Error('Invalid link. Please request a new link.');
        }

        // Set up the form based on the link type
        ui.setupFormForType(tokenType);

        // Set the session with the access token
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token')
        });

        if (sessionError) throw sessionError;

        if (!session?.user?.email) {
            throw new Error('No valid session found. Please use the link from your email.');
        }

        // Set email in form
        ui.updateEmailInput(session.user.email);

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            ui.clearError();

            try {
                const passwordInput = document.getElementById('password');
                const displayNameInput = document.getElementById('displayName');
                
                if (!passwordInput) {
                    throw new Error('Form inputs not found');
                }

                const password = passwordInput.value;

                // Validate password
                security.validatePassword(password);

                // Update user password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });

                if (updateError) throw updateError;

                // If this is an invite link, also update the profile
                if (tokenType === 'invite') {
                    const displayName = displayNameInput.value.trim();
                    if (!displayName) {
                        throw new Error('Display name is required');
                    }

                    const { error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: session.user.id,
                            display_name: displayName
                        });

                    if (profileError) throw profileError;
                }

                // Show success and redirect
                const successMessage = tokenType === 'invite' 
                    ? 'Profile created successfully! Redirecting...'
                    : 'Password reset successfully! Redirecting...';
                
                ui.showError(successMessage, true);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);

            } catch (error) {
                console.error('Update error:', error);
                ui.showError(error.message);
                submitButton.disabled = false;
            }
        });

    } catch (error) {
        console.error('Setup error:', error);
        ui.showError(error.message || 'Invalid or expired link. Please request a new link.');
        if (form) form.style.display = 'none';
    }
});