document.addEventListener('DOMContentLoaded', async () => {
    // Load campaigns and segments
    await Promise.all([loadCampaigns(), loadSegmentsForCampaign()]);

    // Set up event listeners
    document.getElementById('save-campaign').addEventListener('click', async () => {
        await createCampaign();
    });

    document.getElementById('send-campaign').addEventListener('click', async () => {
        await sendCampaign();
    });

    // Check if we came from a segment selection
    const urlParams = new URLSearchParams(window.location.search);
    const segmentId = urlParams.get('segmentId');
    if (segmentId) {
        document.getElementById('campaign-segment').value = segmentId;
    }
});

async function loadCampaigns() {
    try {
        const response = await axios.get('https://cmr-1-p1qb.onrender.com/api/campaigns');
        const campaigns = response.data;
        const campaignList = document.getElementById('campaign-list');
        
        campaignList.innerHTML = campaigns.map(campaign => `
            <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${campaign._id}">
                <div>
                    <h5>${campaign.name}</h5>
                    <p class="mb-1">${campaign.message}</p>
                    <small class="text-muted">
                        Segment: ${campaign.segmentId?.name || 'N/A'} | 
                        Status: ${getCampaignStatus(campaign)}
                    </small>
                </div>
                <button class="btn btn-sm ${campaign.status === 'sent' ? 'btn-success' : 'btn-primary'} select-campaign">
                    ${campaign.status === 'sent' ? 'Sent' : 'Select'}
                </button>
            </li>
        `).join('');

        // Add event listeners to select buttons
        document.querySelectorAll('.select-campaign').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const campaignId = button.closest('li').dataset.id;
                selectCampaign(campaignId);
            });
        });

        // Add event listeners to campaign items
        document.querySelectorAll('#campaign-list li').forEach(item => {
            item.addEventListener('click', () => {
                const campaignId = item.dataset.id;
                selectCampaign(campaignId);
            });
        });
    } catch (error) {
        console.error('Error loading campaigns:', error);
        alert('Failed to load campaigns');
    }
}

function getCampaignStatus(campaign) {
    if (campaign.forceSend) return 'Sent (forced)';
    if (campaign.status === 'sent') return 'Sent';
    if (new Date(campaign.scheduledTime) > new Date()) return 'Scheduled';
    return 'Pending';
}

async function loadSegmentsForCampaign() {
    try {
        const response = await axios.get('https://cmr-1-p1qb.onrender.com/api/segments');
        const segments = response.data;
        const segmentSelect = document.getElementById('campaign-segment');
        
        segmentSelect.innerHTML = segments.map(segment => `
            <option value="${segment._id}">${segment.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading segments:', error);
    }
}

async function createCampaign() {
    const name = document.getElementById('campaign-name').value;
    const heading = document.getElementById('campaign-heading').value;
    const message = document.getElementById('campaign-message').value;
    const segmentId = document.getElementById('campaign-segment').value;
    const forceSend = document.getElementById('force-send').checked;
    const scheduledTime = document.getElementById('scheduled-time').value;

    try {
        const response = await axios.post('https://cmr-1-p1qb.onrender.com/api/campaigns', {
            name,
            heading,
            message,
            segmentId,
            forceSend,
            scheduledTime: scheduledTime || new Date()
        });

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('campaignModal')).hide();
        await loadCampaigns();
        document.getElementById('campaign-form').reset();
    } catch (error) {
        console.error('Error creating campaign:', error);
        alert('Failed to create campaign');
    }
}

let selectedCampaignId = null;

function selectCampaign(campaignId) {
    selectedCampaignId = campaignId;
    const campaignItem = document.querySelector(`#campaign-list li[data-id="${campaignId}"]`);
    
    // Update UI
    document.querySelectorAll('#campaign-list li').forEach(item => {
        item.classList.remove('active');
    });
    campaignItem.classList.add('active');

    // Update selected campaign display
    const selectedDiv = document.getElementById('selected-campaign');
    selectedDiv.classList.remove('d-none');
    selectedDiv.innerHTML = `
        <strong>Selected Campaign:</strong> ${campaignItem.querySelector('h5').textContent}
    `;
}

async function sendCampaign() {
    if (!selectedCampaignId) {
        alert('Please select a campaign first');
        return;
    }

    if (!confirm('Are you sure you want to send this campaign to all customers in the selected segment?')) {
        return;
    }

    try {
        // Get campaign details
        const campaignResponse = await axios.get(`https://cmr-1-p1qb.onrender.com/api/campaigns/${selectedCampaignId}`);
        const campaign = campaignResponse.data;

        console.log("campaign", campaign)
        console.log("campaignId", campaign.segmentId)
        
        // Get customers in segment
        const customersResponse = await axios.get(`https://cmr-1-p1qb.onrender.com/api/segments/customers/${campaign.segmentId.toString()}`);
        const customers = customersResponse.data;

        // Send campaign to each customer (in a real app, you'd batch this)
        for (const customer of customers) {
            await axios.post('https://cmr-1-p1qb.onrender.com/api/communication-log', {
                customerId: customer._id,
                campaignId: selectedCampaignId
            });
        }

        // Update campaign status
        await axios.get(`https://cmr-1-p1qb.onrender.com/api/campaigns/${selectedCampaignId}`, {
            status: 'sent',
            sentAt: new Date()
        });

        alert(`Campaign sent successfully to ${customers.length} customers!`);
        await loadCampaigns();
    } catch (error) {
        console.error('Error sending campaign:', error);
        alert('Failed to send campaign');
    }
}