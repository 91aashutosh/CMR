// Function to show sections based on hash
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionId) {
            section.classList.add('active');
        }
    });
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1); // Remove the leading #
    if (hash) {
        showSection(hash);
    } else {
        showSection('create-audience');
    }
});

// Show the appropriate section based on the current hash on page load
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showSection(hash);
    } else {
        showSection('create-audience');
    }

    // Fetch campaigns when the Campaigns section is shown
    if (hash === 'campaigns') {
        fetchCampaigns();
    }
});

// Handle form submission to create audience
document.getElementById('audience-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const spends = document.getElementById('spends').value;
    const visits = document.getElementById('visits').value;
    const noVisitMonths = document.getElementById('noVisitMonths').value;

    try {
        const response = await axios.get('/api/customers/', {
            params: { spends, visits, noVisitMonths }
        });
        const data = response.data;
        document.getElementById('audience-result').innerHTML = `
            <h3>Audience Created</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;

        // Get audience size after creating
        getAudienceSize();
    } catch (error) {
        document.getElementById('audience-result').innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

// Get audience size after creating
async function getAudienceSize() {
    try {
        const response = await axios.post('/api/audience/check', {
            conditions: [
                { field: 'spends', value: document.getElementById('spends').value },
                { field: 'visits', value: document.getElementById('visits').value },
                { field: 'noVisitMonths', value: document.getElementById('noVisitMonths').value }
            ]
        });
        const audienceSize = response.data.audienceSize;
        console.log('Audience Size:', audienceSize);
    } catch (error) {
        console.error('Error fetching audience size:', error.message);
    }
}

// Fetch campaigns and display them
async function fetchCampaigns() {
    try {
        const response = await axios.get('/api/campaigns/');
        const data = response.data;
        const campaignList = document.getElementById('campaign-list');
        campaignList.innerHTML = data.map(campaign => `
            <li class="list-group-item">${campaign.message} (Created: ${new Date(createdAt).toLocaleDateString()})</li>
        `).join('');
    } catch (error) {
        document.getElementById('campaign-list').innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Ensure campaigns are fetched when navigating to the Campaigns section
window.addEventListener('hashchange', () => {
    console.log('Hash changed:', window.location.hash);
    if (window.location.hash === '#/campaigns') {
        fetchCampaigns();
    }
});

