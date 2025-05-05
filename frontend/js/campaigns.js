document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const campaignsTable = document.getElementById('campaigns-list');
    const campaignForm = document.getElementById('new-campaign-form');
    const segmentSelect = document.getElementById('campaign-segment');
    const scheduleSelect = document.getElementById('campaign-schedule');
    const dateContainer = document.getElementById('schedule-date-container');
    const campaignSpinner = document.getElementById('campaign-spinner');
    
    // Chart instance
    let campaignChart = null;
    
    // Initialize the page
    loadCampaigns();
    loadSegmentsForCampaign();
    setupEventListeners();
    
    // Load campaigns from API
    function loadCampaigns() {
        axios.get('https://cmr-1-p1qb.onrender.com/api/campaigns')
            .then(response => {
                renderCampaigns(response.data);
                renderCampaignStats(response.data);
                renderRecentActivity(response.data);
            })
            .catch(error => {
                console.error('Error loading campaigns:', error);
                campaignsTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-danger">
                            <i class="bi bi-exclamation-triangle fs-4"></i>
                            <p class="mt-2">Failed to load campaigns. Please try again.</p>
                            <button class="btn btn-sm btn-outline-primary" onclick="loadCampaigns()">
                                <i class="bi bi-arrow-clockwise"></i> Retry
                            </button>
                        </td>
                    </tr>
                `;
            });
    }
    
    // Load segments for campaign form
    function loadSegmentsForCampaign() {
        axios.get('https://cmr-1-p1qb.onrender.com/api/segments')
            .then(response => {
                segmentSelect.innerHTML = response.data.map(segment => `
                    <option value="${segment._id}">${segment.name} (${segment.customerCount || 0} customers)</option>
                `).join('');
                
                // If coming from segment page with preselection
                const urlParams = new URLSearchParams(window.location.search);
                const segmentId = urlParams.get('segmentId');
                if (segmentId) {
                    segmentSelect.value = segmentId;
                }
            })
            .catch(error => {
                console.error('Error loading segments:', error);
                segmentSelect.innerHTML = '<option value="">Failed to load segments</option>';
            });
    }
    
    // Render campaigns table
    function renderCampaigns(campaigns) {
        if (campaigns.length === 0) {
            campaignsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-megaphone fs-4 text-muted"></i>
                        <p class="mt-2">No campaigns found</p>
                        <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#newCampaignModal">
                            <i class="bi bi-plus-lg"></i> Create Your First Campaign
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        campaignsTable.innerHTML = campaigns.map(campaign => `
            <tr data-id="${campaign._id}">
                <td>
                    <strong>${campaign.name}</strong>
                    <div class="text-muted small">${campaign.heading || 'No subject'}</div>
                </td>
                <td>
                    <span class="badge ${getStatusBadgeClass(campaign.status)}">
                        ${campaign.status || 'Draft'}
                    </span>
                </td>
                <td>${campaign.segmentId?.name || 'No segment'}</td>
                <td>${campaign.sentCount || 0}/${campaign.totalCount || 0}</td>
                <td>${campaign.openRate ? campaign.openRate + '%' : 'N/A'}</td>
                <td>${formatDate(campaign.lastSent || campaign.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-campaign" data-id="${campaign._id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                    ${campaign.status === 'Draft' ? `
                    <button class="btn btn-sm btn-outline-success ms-2 send-campaign" data-id="${campaign._id}">
                        <i class="bi bi-send"></i> Send
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
        
        // Update campaign count
        document.getElementById('campaign-count').textContent = `Showing ${campaigns.length} campaigns`;
        
        // Add event listeners
        document.querySelectorAll('.view-campaign').forEach(btn => {
            btn.addEventListener('click', () => viewCampaignDetails(btn.dataset.id));
        });
        
        document.querySelectorAll('.send-campaign').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                sendCampaign(btn.dataset.id);
            });
        });
    }
    
// Add this function to campaigns.js
function renderCampaignStats(campaigns) {
    const ctx = document.getElementById('campaign-stats-chart');
    if (!ctx) return;

    // Dummy data for the chart
    const dummyCampaigns = [
        { name: "Summer Sale", openRate: 65, clickRate: 25 },
        { name: "Winter Collection", openRate: 72, clickRate: 32 },
        { name: "New Arrivals", openRate: 58, clickRate: 18 },
        { name: "Clearance Event", openRate: 81, clickRate: 42 }
    ];

    // Destroy previous chart if exists
    if (window.campaignChart) {
        window.campaignChart.destroy();
    }

    window.campaignChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dummyCampaigns.map(c => c.name),
            datasets: [
                {
                    label: 'Open Rate %',
                    data: dummyCampaigns.map(c => c.openRate),
                    backgroundColor: 'rgba(78, 115, 223, 0.6)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Click Rate %',
                    data: dummyCampaigns.map(c => c.clickRate),
                    backgroundColor: 'rgba(28, 200, 138, 0.6)',
                    borderColor: 'rgba(28, 200, 138, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

    
    // Render recent activity
    function renderRecentActivity(campaigns) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;
        
        // Sort campaigns by date
        const sortedCampaigns = [...campaigns].sort((a, b) => 
            new Date(b.lastSent || b.createdAt) - new Date(a.lastSent || a.createdAt));
        
        activityList.innerHTML = sortedCampaigns.slice(0, 5).map(campaign => `
            <li class="list-group-item border-0 border-bottom py-3">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="mb-1">${campaign.name}</h6>
                        <small class="text-muted">
                            ${campaign.status === 'Sent' ? 
                              `Sent to ${campaign.sentCount || 0} customers` : 
                              `Created ${formatDate(campaign.createdAt)}`}
                        </small>
                    </div>
                    <span class="badge ${getStatusBadgeClass(campaign.status)}">
                        ${campaign.status || 'Draft'}
                    </span>
                </div>
            </li>
        `).join('');
    }
    
    // View campaign details
    function viewCampaignDetails(campaignId) {
        axios.get(`https://cmr-1-p1qb.onrender.com/api/campaigns/${campaignId}`)
            .then(response => {
                const campaign = response.data;
                
                document.getElementById('campaign-detail-title').textContent = campaign.name;
                document.getElementById('campaign-detail-content').innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-4">
                                <h6>Campaign Details</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <th>Status:</th>
                                        <td>
                                            <span class="badge ${getStatusBadgeClass(campaign.status)}">
                                                ${campaign.status}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Segment:</th>
                                        <td>${campaign.segmentId?.name || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <th>Created:</th>
                                        <td>${formatDate(campaign.createdAt)}</td>
                                    </tr>
                                    <tr>
                                        <th>Last Sent:</th>
                                        <td>${campaign.lastSent ? formatDate(campaign.lastSent) : 'Not sent'}</td>
                                    </tr>
                                    <tr>
                                        <th>Recipients:</th>
                                        <td>${campaign.sentCount || 0}/${campaign.totalCount || 0}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <div>
                                <h6>Performance</h6>
                                <div class="row text-center">
                                    <div class="col-4">
                                        <div class="p-3 bg-light rounded">
                                            <h3 class="mb-0">${campaign.openRate || '0'}%</h3>
                                            <small class="text-muted">Open Rate</small>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="p-3 bg-light rounded">
                                            <h3 class="mb-0">${campaign.clickRate || '0'}%</h3>
                                            <small class="text-muted">Click Rate</small>
                                        </div>
                                    </div>
                                    <div class="col-4">
                                        <div class="p-3 bg-light rounded">
                                            <h3 class="mb-0">${campaign.conversionRate || '0'}%</h3>
                                            <small class="text-muted">Conversions</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6>Message Preview</h6>
                            <div class="border p-3 bg-light rounded">
                                <h5>${campaign.subject || 'No subject'}</h5>
                                <hr>
                                <div>${campaign.message || 'No message content'}</div>
                            </div>
                        </div>
                    </div>
                `;
                
                new bootstrap.Modal(document.getElementById('campaignDetailsModal')).show();
            })
            .catch(error => {
                console.error('Error loading campaign details:', error);
                alert('Failed to load campaign details');
            });
    }
    
    // Send campaign
    function sendCampaign(campaignId) {
        if (!confirm('Are you sure you want to send this campaign?')) return;
        
        const btn = document.querySelector(`.send-campaign[data-id="${campaignId}"]`);
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status"></span>
            Sending...
        `;
        btn.disabled = true;
        
        axios.post(`https://cmr-1-p1qb.onrender.com/api/campaigns/${campaignId}/send`)
            .then(response => {
                alert('Campaign sent successfully!');
                loadCampaigns(); // Refresh the list
            })
            .catch(error => {
                console.error('Error sending campaign:', error);
                alert('Failed to send campaign');
            })
            .finally(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Schedule toggle
        if (scheduleSelect && dateContainer) {
            scheduleSelect.addEventListener('change', function() {
                dateContainer.style.display = this.value === 'scheduled' ? 'block' : 'none';
            });
        }
        
        // Campaign form submission
        if (campaignForm) {
            campaignForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (!this.checkValidity()) {
                    e.stopPropagation();
                    this.classList.add('was-validated');
                    return;
                }
                
                const formData = {
                    name: document.getElementById('campaign-name').value,
                    segmentId: document.getElementById('campaign-segment').value,
                    heading: document.getElementById('campaign-subject').value,
                    message: document.getElementById('campaign-message').value,
                    forceSend: true,
                    scheduledTime: new Date()
                };
                
                campaignSpinner.classList.remove('d-none');
                document.getElementById('save-campaign').disabled = true;
                
                axios.post('https://cmr-1-p1qb.onrender.com/api/campaigns', formData)
                    .then(response => {
                        alert('Campaign created successfully!');
                        loadCampaigns();
                        bootstrap.Modal.getInstance(document.getElementById('newCampaignModal')).hide();
                        this.reset();
                        this.classList.remove('was-validated');
                    })
                    .catch(error => {
                        console.error('Error creating campaign:', error);
                        alert('Failed to create campaign');
                    })
                    .finally(() => {
                        campaignSpinner.classList.add('d-none');
                        document.getElementById('save-campaign').disabled = false;
                    });
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('campaign-search');
        const searchButton = document.getElementById('search-campaigns');
        
        if (searchInput && searchButton) {
            const performSearch = () => {
                const searchTerm = searchInput.value.trim();
                // In a real app, you would filter or re-fetch with search term
                console.log('Searching for:', searchTerm);
            };
            
            searchButton.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch();
            });
        }
    }
    
    // Helper functions
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Sent': return 'bg-success';
            case 'Scheduled': return 'bg-info';
            case 'Draft': return 'bg-secondary';
            case 'Failed': return 'bg-danger';
            default: return 'bg-light text-dark';
        }
    }

    const aiSuggestBtn = document.getElementById('ai-suggest-btn');
  if (aiSuggestBtn) {
    aiSuggestBtn.addEventListener('click', async () => {
      const spinner = aiSuggestBtn.querySelector('.spinner-border');
      spinner.classList.remove('d-none');
      aiSuggestBtn.disabled = true;
      
      try {
        const response = await axios.get('https://cmr-1-p1qb.onrender.com/api/ai/suggest-segments');
        renderAISuggestions(response.data);
      } catch (error) {
        showErrorToast('Failed to get AI suggestions. Please try again later.');
      } finally {
        spinner.classList.add('d-none');
        aiSuggestBtn.disabled = false;
      }
    });
  }

  function renderAISuggestions(suggestions) {
    const container = document.getElementById('ai-suggestions-container');
    if (!container || !suggestions.length) return;
    
    container.innerHTML = suggestions.map(suggestion => `
      <div class="col-md-6 mb-4">
        <div class="card ai-segment-card h-100">
          <div class="card-header">
            <h5 class="mb-0">${suggestion.name}</h5>
          </div>
          <div class="card-body">
            <p class="text-muted">${suggestion.description}</p>
            
            <div class="mb-3">
              <h6 class="text-primary">Filters:</h6>
              <div class="d-flex flex-wrap gap-2">
                ${suggestion.filters.minSpend ? `
                  <span class="badge bg-light text-dark">
                    <i class="bi bi-currency-dollar me-1"></i> Min $${suggestion.filters.minSpend}
                  </span>
                ` : ''}
                
                ${suggestion.filters.minVisits ? `
                  <span class="badge bg-light text-dark">
                    <i class="bi bi-shop me-1"></i> ${suggestion.filters.minVisits}+ visits
                  </span>
                ` : ''}
                
                ${suggestion.filters.inactivityMonths ? `
                  <span class="badge bg-light text-dark">
                    <i class="bi bi-clock-history me-1"></i> Inactive ${suggestion.filters.inactivityMonths}m
                  </span>
                ` : ''}
              </div>
            </div>
            
            <div class="mb-3 p-3 bg-light rounded">
              <h6 class="text-success">Recommended Offer:</h6>
              <p class="mb-0">${suggestion.offer}</p>
            </div>
            
            <button class="btn btn-primary w-100 use-suggestion"
                    data-min-spends="${suggestion.filters.minSpend || ''}"
                    data-min-visits="${suggestion.filters.minVisits || ''}"
                    data-inactive-months="${suggestion.filters.inactivityMonths || ''}">
              <i class="bi bi-check-circle me-2"></i> Apply This Segment
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Add event listeners to apply suggestions
    document.querySelectorAll('.use-suggestion').forEach(btn => {
      btn.addEventListener('click', function() {
        // Apply filters to segment form
        document.getElementById('min-spends').value = this.dataset.minSpends || '';
        document.getElementById('min-visits').value = this.dataset.minVisits || '';
        document.getElementById('inactive-months').value = this.dataset.inactiveMonths || '';
        
        // Show confirmation
        showSuccessToast(`"${this.closest('.card').querySelector('h5').textContent}" filters applied!`);
      });
    });
  }
  
  function showSuccessToast(message) {
    // Implement toast notification
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.innerHTML = `
      <div class="toast show" role="alert">
        <div class="toast-header bg-success text-white">
          <strong class="me-auto">Success</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

});

// Make loadCampaigns available globally for retry button
window.loadCampaigns = function() {
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
};