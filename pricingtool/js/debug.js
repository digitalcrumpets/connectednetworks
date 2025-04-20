// Simple debug script to verify basic functionality 
document.addEventListener('DOMContentLoaded', () => {
    console.log('Debug script loaded successfully!');
    
    // 1. Make sure first step is visible
    const firstStep = document.querySelector('#quoteServiceType');
    if (firstStep) {
        firstStep.classList.add('active-step');
        console.log('First step made visible');
    } else {
        console.error('First step element not found!');
    }
    
    // 2. Setup basic navigation (simplified version)
    document.querySelectorAll('.button.primary').forEach(button => {
        button.addEventListener('click', (e) => {
            const currentSection = e.target.closest('.quotequestionssection');
            const currentId = currentSection.id;
            console.log(`Next button clicked on step: ${currentId}`);
            
            // Hide current step
            currentSection.classList.remove('active-step');
            
            // Show next step (simple for testing)
            const nextSection = currentSection.nextElementSibling;
            if (nextSection && nextSection.classList.contains('quotequestionssection')) {
                nextSection.classList.add('active-step');
                console.log(`Showing next step: ${nextSection.id}`);
                
                // Update progress bar (simplified)
                const allSteps = document.querySelectorAll('.quotequestionssection');
                const progressBar = document.getElementById('progressBarFill');
                const progressText = document.getElementById('progressBarText');
                
                // Find current step index
                const allStepsArray = Array.from(allSteps);
                const currentIndex = allStepsArray.indexOf(nextSection);
                
                if (progressBar && progressText) {
                    const progress = ((currentIndex + 1) / allSteps.length) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `Step ${currentIndex + 1} of ${allSteps.length}`;
                    console.log(`Updated progress to ${progress}%`);
                }
            } else {
                console.log('No next step found or reached end of form');
                // If last step, we would submit the form
                if (currentId === 'quoteContractTerms') {
                    console.log('Form would be submitted here');
                }
            }
        });
    });
    
    // 3. Setup prev buttons
    document.querySelectorAll('.button.secondary').forEach(button => {
        button.addEventListener('click', (e) => {
            const currentSection = e.target.closest('.quotequestionssection');
            
            // Hide current step
            currentSection.classList.remove('active-step');
            
            // Show previous step (simple for testing)
            const prevSection = currentSection.previousElementSibling;
            if (prevSection && prevSection.classList.contains('quotequestionssection')) {
                prevSection.classList.add('active-step');
                console.log(`Showing previous step: ${prevSection.id}`);
                
                // Update progress bar (simplified)
                const allSteps = document.querySelectorAll('.quotequestionssection');
                const progressBar = document.getElementById('progressBarFill');
                const progressText = document.getElementById('progressBarText');
                
                // Find current step index
                const allStepsArray = Array.from(allSteps);
                const currentIndex = allStepsArray.indexOf(prevSection);
                
                if (progressBar && progressText) {
                    const progress = ((currentIndex + 1) / allSteps.length) * 100;
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `Step ${currentIndex + 1} of ${allSteps.length}`;
                }
            } else {
                console.log('No previous step found');
            }
        });
    });
    
    // 4. Add basic selection functionality for card items
    document.querySelectorAll('.quotequestionscarditem').forEach(card => {
        card.addEventListener('click', (e) => {
            const container = e.target.closest('.quotequestionscardcontainer');
            container.querySelectorAll('.quotequestionscarditem').forEach(item => {
                item.classList.remove('selected');
            });
            e.target.classList.add('selected');
            console.log(`Selected: ${e.target.dataset.value || e.target.textContent}`);
            
            // Enable next button
            const section = e.target.closest('.quotequestionssection');
            const nextButton = section.querySelector('.button.primary');
            if (nextButton) nextButton.disabled = false;
        });
    });
    
    // 5. Set up basic dropdown functionality
    document.querySelectorAll('.quotequestionsdropdowntoggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const dropdown = e.target.closest('.quotequestionsdropdown');
            const list = dropdown.querySelector('.quotequestionsdropdownlist');
            
            // Toggle dropdown
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            list.style.display = isExpanded ? 'none' : 'block';
        });
    });
    
    document.querySelectorAll('.quotequestionsdropdownlink').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const dropdown = e.target.closest('.quotequestionsdropdown');
            const toggle = dropdown.querySelector('.quotequestionsdropdowntoggle');
            const toggleText = toggle.querySelector('div');
            const list = dropdown.querySelector('.quotequestionsdropdownlist');
            
            // Update dropdown value
            toggleText.textContent = e.target.textContent;
            
            // Close dropdown
            toggle.setAttribute('aria-expanded', 'false');
            list.style.display = 'none';
            
            // Set selected state
            dropdown.querySelectorAll('.quotequestionsdropdownlink').forEach(item => {
                item.classList.remove('selected');
            });
            e.target.classList.add('selected');
            
            // Enable next button
            const section = e.target.closest('.quotequestionssection');
            const nextButton = section.querySelector('.button.primary');
            if (nextButton) nextButton.disabled = false;
            
            console.log(`Selected dropdown value: ${e.target.textContent}`);
        });
    });
    
    // Initialize progress bar at start
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressBarText');
    if (progressBar && progressText) {
        const allSteps = document.querySelectorAll('.quotequestionssection');
        progressBar.style.width = `${(1 / allSteps.length) * 100}%`;
        progressText.textContent = `Step 1 of ${allSteps.length}`;
    }
    
    console.log('Debug initialization complete!');
});
