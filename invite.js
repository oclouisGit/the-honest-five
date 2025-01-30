// invite.js
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('inviteForm');
    const emailInput = document.getElementById('email');
    const errorDiv = document.getElementById('error');
    const submitButton = document.getElementById('submitButton');

    try {
        // Get the invite token from the URL
        const hash = window.location.hash;
        if (!hash.includes('#invite-token=')) {
            throw new Error('Invalid invite link');
        }

        // Get the user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user?.email) {
            throw new Error('No valid invite session found');
        }

        // Display the email
        emailInput.value = session.user.email;

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            errorDiv.textContent = '';

            try {
                const password = document.getElementById('password').value;

                // Validate password
                security.validatePassword(password);

                // Update the user's password
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password
                });

                if (updateError) throw updateError;

                // Show success and redirect
                errorDiv.textContent = 'Account created successfully!';
                errorDiv.className = 'success-message';
                
                // Redirect to the main app after a short delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);

            } catch (error) {
                errorDiv.textContent = error.message;
                submitButton.disabled = false;
            }
        });

    } catch (error) {
        errorDiv.textContent = error.message;
        form.style.display = 'none';
    }
});