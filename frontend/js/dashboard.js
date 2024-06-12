window.addEventListener('load', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const spends = urlParams.get('spends');
    const visits = urlParams.get('visits');
    const noVisitMonths = urlParams.get('noVisitMonths');
    try {
        // Get URL parameters

        // Fetch audience list
        const audienceResponse = await axios.post('http://localhost:5000/api/customers/getList', {
            spends,
            visits,
            noVisitMonths
        });
        const audienceList = audienceResponse.data;
        displayAudienceList(audienceList);

        // Fetch campaigns list
        const campaignsResponse = await axios.get('http://localhost:5000/api/campaigns');
        const campaigns = campaignsResponse.data;
        displayCampaignsList(campaigns);

                // Add event listener to campaign cards for selection
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }

    // Add event listener to the campaign form submission
    document.getElementById('campaign-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = document.getElementById('message').value;
        try {
            const response = await axios.post('http://localhost:5000/api/campaigns/', { message });
            displayCampaign(response.data);
            document.getElementById('message').value = '';
        } catch (error) {
            console.error('Error creating campaign:', error.message);
        }
    });

    const campaignCards = document.querySelectorAll('.card');
    campaignCards.forEach(card => {
        card.addEventListener('click', () => {
            selectCampaign(card);
        });
    });

        // Add event listener to the "Send Message" button
        document.getElementById('send-message').addEventListener('click', async () => {
            try {
                const selectedCampaign = document.querySelector('.card.selected');
                if (!selectedCampaign) {
                    alert('Please select a campaign to send messages');
                    return;
                }

                const message = selectedCampaign.dataset.message;
                console.log(message)
                const audienceResponse = await axios.post('http://localhost:5000/api/customers/getList', {
                    spends,
                    visits,
                    noVisitMonths
                });
                const audienceList = audienceResponse.data;

                console.log("audienceList", audienceList);
    
                for (const customer of audienceList) {
                    const response  = await axios.post('http://localhost:5000/api/communication-log', {
                        customer: customer._id,
                        message: message
                    });
                }
                alert('Messages have been sent successfully!');
            } catch (error) {
                console.error('Error sending messages:', error.message);
            }
        });
});



function displayAudienceList(audienceList) {
    const audienceListElement = document.getElementById('audience-list');
    audienceListElement.innerHTML = audienceList.map(audience => `
        <div class="card mb-2">
            <div class="card-body">
                <h5 class="card-title">Customer: ${audience.name}</h5>
                <p class="card-text">Spends: ${audience.totalSpends}, Visits: ${audience.visits}</p>
            </div>
        </div>
    `).join('');
}

function displayCampaignsList(campaigns) {
    const campaignListElement = document.getElementById('campaign-list');
    campaignListElement.innerHTML = campaigns.map(campaign => `
        <div class="card mb-2" data-message="${campaign.message}">
            <div class="card-body">
                <h5 class="card-title">${campaign.message}</h5>
                <p class="card-text">Created: ${new Date(campaign.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayCampaign(campaign) {
    const campaignListElement = document.getElementById('campaign-list');
    const newCampaignHTML = `
        <div class="card mb-2" data-message="${campaign.message}">
            <div class="card-body">
                <h5 class="card-title">${campaign.message}</h5>
                <p class="card-text">Created: ${new Date(campaign.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    `;
    campaignListElement.insertAdjacentHTML('afterbegin', newCampaignHTML);
}

function selectCampaign(campaignElement) {
    const campaignCards = document.querySelectorAll('.card');
    campaignCards.forEach(card => card.classList.remove('selected'));
    campaignElement.classList.add('selected');
}
