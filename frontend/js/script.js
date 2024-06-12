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
// window.addEventListener('hashchange', () => {
//     let hash = window.location.hash.substring(1); // Remove the leading #
//     if (hash) {
//         showSection(hash);
//     } else {
//         showSection('create-audience');
//     }
// });

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
    let hash = window.location.hash.substring(1);
    if (window.location.hash === '#/campaigns') {
        fetchCampaigns();
    } else if (window.location.hash === '#/create-audience') {
        showSection('create-audience');
    } else if (window.location.hash === '#/') {
        // Add logic to handle default section (if needed)
        showSection('create-audience');
    }
});



// Function to handle form submission for creating audience
document.getElementById('audience-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const spends = document.getElementById('spends').value;
    const visits = document.getElementById('visits').value;
    const noVisitMonths = document.getElementById('noVisitMonths').value;

    try {
        const response = await axios.post('http://localhost:5000/api/audience/check', {
            spends,
            visits,
            noVisitMonths
        });
        const audienceSize = response.data.audienceSize;
        document.getElementById('audience-result').innerHTML = `
            <h3>Audience Size: ${audienceSize}</h3>
        `;
    } catch (error) {
        document.getElementById('audience-result').innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

// Function to fetch campaigns when the Campaigns section is shown
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#/campaigns') {
        fetchCampaigns();
    }
});

// document.addEventListener('DOMContentLoaded', () => {
//     // Add event listener to the "Save and Continue" button
    document.getElementById('save-continue').addEventListener('click', async () => {
        try {

                    const spends = document.getElementById('spends').value;
                    const visits = document.getElementById('visits').value;
                    const noVisitMonths = document.getElementById('noVisitMonths').value;
                    console.log(spends, visits, noVisitMonths);
        const queryParams = `spends=${spends}&visits=${visits}&noVisitMonths=${noVisitMonths}`;
        window.location.href = `dashboard.html?${queryParams}`;
        } catch (error) {
            console.error('Error creating audience:', error.message);
        }
    });
// })

// Function to fetch campaigns
async function fetchCampaigns() {
    try {
        const response = await axios.get('/api/campaigns');
        const campaigns = response.data;
        console.log('Campaigns:', campaigns);
        // Update the UI with the fetched campaigns
    } catch (error) {
        console.error('Error fetching campaigns:', error.message);
    }
}



