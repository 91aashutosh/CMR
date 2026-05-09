document.addEventListener('DOMContentLoaded', function() {
    const campaignsTable = document.getElementById('campaigns-list');
    const campaignForm = document.getElementById('new-campaign-form');
    const segmentSelect = document.getElementById('campaign-segment');
    const scheduleSelect = document.getElementById('campaign-schedule');
    const dateContainer = document.getElementById('schedule-date-container');
    const campaignSpinner = document.getElementById('campaign-spinner');
    const mediaFields = ['media-type', 'media-title', 'media-url', 'media-alt', 'media-caption'];

    let allCampaigns = [];
    let latestJourneyId = null;

    loadCampaigns();
    loadSegmentsForCampaign();
    loadJourneys();
    setupEventListeners();

    function loadCampaigns() {
        axios.get(apiUrl('campaigns'))
            .then(response => {
                allCampaigns = response.data || [];
                renderCampaigns(allCampaigns);
                renderCampaignStats(allCampaigns);
                renderRecentActivity(allCampaigns);
            })
            .catch(error => {
                console.error('Error loading campaigns:', error);
                campaignsTable.innerHTML = errorRow('Failed to load campaigns. Please try again.', 7);
            });
    }

    function loadSegmentsForCampaign() {
        axios.get(apiUrl('segments'))
            .then(response => {
                const segments = response.data || [];
                segmentSelect.innerHTML = `<option value="">Choose a segment</option>` + segments.map(segment => `
                    <option value="${segment._id}">${escapeHtml(segment.name)} (${segment.customerCount || 0} customers)</option>
                `).join('');

                const segmentId = new URLSearchParams(window.location.search).get('segmentId');
                if (segmentId) segmentSelect.value = segmentId;
            })
            .catch(error => {
                console.error('Error loading segments:', error);
                segmentSelect.innerHTML = '<option value="">Failed to load segments</option>';
            });
    }

    function renderCampaigns(campaigns) {
        if (!campaigns.length) {
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
            document.getElementById('campaign-count').textContent = 'Showing 0 campaigns';
            return;
        }

        campaignsTable.innerHTML = campaigns.map(campaign => {
            const stats = campaign.deliveryStats || {};
            const hasFailures = Number(stats.failed || 0) > 0;
            return `
                <tr data-id="${campaign._id}">
                    <td>
                        <strong>${escapeHtml(campaign.name)}</strong>
                        <div class="text-muted small">${escapeHtml(campaign.heading || 'No subject')}</div>
                        ${campaign.media?.type && campaign.media.type !== 'none' ? '<span class="badge bg-info-subtle text-info-emphasis mt-1"><i class="bi bi-image me-1"></i>Rich media</span>' : ''}
                    </td>
                    <td><span class="badge ${getStatusBadgeClass(campaign.status)}">${campaign.status || 'draft'}</span></td>
                    <td>${escapeHtml(campaign.segmentId?.name || 'No segment')}</td>
                    <td>${stats.delivered || 0}/${stats.total || 0}</td>
                    <td>${campaign.openRate ? campaign.openRate + '%' : 'N/A'}</td>
                    <td>${formatDate(campaign.lastSent || campaign.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-campaign" data-id="${campaign._id}">
                            <i class="bi bi-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-success ms-2 send-campaign" data-id="${campaign._id}">
                            <i class="bi bi-send"></i> Send
                        </button>
                        ${hasFailures ? `
                            <button class="btn btn-sm btn-outline-warning ms-2 retry-campaign" data-id="${campaign._id}">
                                <i class="bi bi-arrow-clockwise"></i> Retry
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('campaign-count').textContent = `Showing ${campaigns.length} campaigns`;
        document.querySelectorAll('.view-campaign').forEach(btn => btn.addEventListener('click', () => viewCampaignDetails(btn.dataset.id)));
        document.querySelectorAll('.send-campaign').forEach(btn => btn.addEventListener('click', () => sendCampaign(btn.dataset.id, btn)));
        document.querySelectorAll('.retry-campaign').forEach(btn => btn.addEventListener('click', () => retryFailedDeliveries(btn.dataset.id, btn)));
    }

    function renderCampaignStats(campaigns) {
        const ctx = document.getElementById('campaign-stats-chart');
        if (!ctx) return;

        const chartCampaigns = campaigns.length ? campaigns.slice(0, 6).reverse() : [
            { name: 'Sample Sale', openRate: 64, clickRate: 22 },
            { name: 'Media Offer', openRate: 72, clickRate: 31 },
        ];

        if (window.campaignChart) window.campaignChart.destroy();
        window.campaignChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartCampaigns.map(c => c.name),
                datasets: [
                    {
                        label: 'Open Rate %',
                        data: chartCampaigns.map(c => c.openRate || 0),
                        backgroundColor: 'rgba(78, 115, 223, 0.6)',
                        borderColor: 'rgba(78, 115, 223, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Click Rate %',
                        data: chartCampaigns.map(c => c.clickRate || 0),
                        backgroundColor: 'rgba(28, 200, 138, 0.6)',
                        borderColor: 'rgba(28, 200, 138, 1)',
                        borderWidth: 1,
                    },
                ],
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
        });
    }

    function renderRecentActivity(campaigns) {
        const activityList = document.getElementById('recent-activity');
        if (!activityList) return;

        if (!campaigns.length) {
            activityList.innerHTML = '<li class="list-group-item border-0 py-3 text-muted">No recent activity yet.</li>';
            return;
        }

        activityList.innerHTML = [...campaigns]
            .sort((a, b) => new Date(b.lastSent || b.createdAt) - new Date(a.lastSent || a.createdAt))
            .slice(0, 5)
            .map(campaign => {
                const stats = campaign.deliveryStats || {};
                return `
                    <li class="list-group-item border-0 border-bottom py-3">
                        <div class="d-flex justify-content-between gap-3">
                            <div>
                                <h6 class="mb-1">${escapeHtml(campaign.name)}</h6>
                                <small class="text-muted">
                                    ${stats.total ? `${stats.delivered || 0} delivered, ${stats.failed || 0} failed` : `Created ${formatDate(campaign.createdAt)}`}
                                </small>
                            </div>
                            <span class="badge ${getStatusBadgeClass(campaign.status)}">${campaign.status || 'draft'}</span>
                        </div>
                    </li>
                `;
            }).join('');
    }

    function viewCampaignDetails(campaignId) {
        Promise.all([
            axios.get(apiUrl(`campaigns/${campaignId}`)),
            axios.get(apiUrl(`campaigns/${campaignId}/delivery-logs`)).catch(() => ({ data: [] })),
        ]).then(([campaignResponse, logsResponse]) => {
            const campaign = campaignResponse.data;
            const logs = logsResponse.data || [];
            const stats = campaign.deliveryStats || {};
            document.getElementById('campaign-detail-title').textContent = campaign.name;
            document.getElementById('campaign-detail-content').innerHTML = `
                <div class="row g-4">
                    <div class="col-lg-6">
                        <h6>Campaign Details</h6>
                        <table class="table table-sm">
                            <tr><th>Status:</th><td><span class="badge ${getStatusBadgeClass(campaign.status)}">${campaign.status}</span></td></tr>
                            <tr><th>Segment:</th><td>${escapeHtml(campaign.segmentId?.name || 'N/A')}</td></tr>
                            <tr><th>Created:</th><td>${formatDate(campaign.createdAt)}</td></tr>
                            <tr><th>Last Sent:</th><td>${campaign.lastSent ? formatDate(campaign.lastSent) : 'Not sent'}</td></tr>
                            <tr><th>Delivery:</th><td>${stats.delivered || 0} delivered, ${stats.failed || 0} failed, ${stats.retried || 0} retried</td></tr>
                        </table>
                        <div class="row text-center">
                            <div class="col-4"><div class="p-3 bg-light rounded"><h3 class="mb-0">${campaign.openRate || 0}%</h3><small class="text-muted">Open Rate</small></div></div>
                            <div class="col-4"><div class="p-3 bg-light rounded"><h3 class="mb-0">${campaign.clickRate || 0}%</h3><small class="text-muted">Click Rate</small></div></div>
                            <div class="col-4"><div class="p-3 bg-light rounded"><h3 class="mb-0">${campaign.conversionRate || 0}%</h3><small class="text-muted">Conversions</small></div></div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <h6>Message Preview</h6>
                        <div class="border p-3 bg-light rounded">
                            ${renderMediaPreview(campaign.media)}
                            <h5>${escapeHtml(campaign.heading || 'No subject')}</h5>
                            <hr>
                            <div>${escapeHtml(campaign.message || 'No message content').replaceAll('\n', '<br>')}</div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0">Delivery Logs</h6>
                            ${(stats.failed || 0) ? `<button class="btn btn-sm btn-outline-warning retry-campaign-detail" data-id="${campaign._id}"><i class="bi bi-arrow-clockwise me-1"></i>Smart Retry Failed</button>` : ''}
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm align-middle">
                                <thead><tr><th>Customer</th><th>Status</th><th>Reason</th><th>Retries</th><th>Last Attempt</th></tr></thead>
                                <tbody>
                                    ${logs.length ? logs.slice(0, 12).map(log => `
                                        <tr>
                                            <td>${escapeHtml(log.customerId?.name || 'Customer')}</td>
                                            <td><span class="badge ${getDeliveryBadgeClass(log.status)}">${log.status}</span></td>
                                            <td>${escapeHtml(log.failureReason || '-')}</td>
                                            <td>${log.retryCount || 0}</td>
                                            <td>${formatDate(log.lastAttemptAt || log.createdAt)}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="5" class="text-muted">No delivery logs yet.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            document.querySelector('.retry-campaign-detail')?.addEventListener('click', e => retryFailedDeliveries(e.currentTarget.dataset.id, e.currentTarget));
            new bootstrap.Modal(document.getElementById('campaignDetailsModal')).show();
        }).catch(error => {
            console.error('Error loading campaign details:', error);
            showToast('Failed to load campaign details', 'danger');
        });
    }

    function sendCampaign(campaignId, btn) {
        withButtonLoading(btn, 'Sending...', () => axios.post(apiUrl(`campaigns/${campaignId}/send`))
            .then(() => {
                showToast('Campaign sent. Delivery receipts are updated.', 'success');
                loadCampaigns();
            }));
    }

    function retryFailedDeliveries(campaignId, btn) {
        withButtonLoading(btn, 'Retrying...', () => axios.post(apiUrl(`campaigns/${campaignId}/retry-failed`))
            .then(response => {
                showToast(`Smart Retry completed for ${response.data.retried || 0} failed deliveries.`, 'success');
                loadCampaigns();
            }));
    }

    function setupEventListeners() {
        scheduleSelect?.addEventListener('change', function() {
            dateContainer.style.display = this.value === 'scheduled' ? 'block' : 'none';
        });

        campaignForm?.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!this.checkValidity()) {
                this.classList.add('was-validated');
                return;
            }

            const scheduledValue = document.getElementById('campaign-date').value;
            const formData = {
                name: document.getElementById('campaign-name').value,
                segmentId: document.getElementById('campaign-segment').value,
                heading: document.getElementById('campaign-subject').value,
                message: document.getElementById('campaign-message').value,
                media: readMediaForm(),
                retrySettings: { enabled: true, maxRetries: 2 },
                forceSend: true,
                scheduledTime: scheduleSelect.value === 'scheduled' && scheduledValue ? new Date(scheduledValue) : new Date(),
            };

            campaignSpinner.classList.remove('d-none');
            document.getElementById('save-campaign').disabled = true;
            axios.post(apiUrl('campaigns'), formData)
                .then(response => {
                    showToast('Campaign created successfully.', 'success');
                    loadCampaigns();
                    bootstrap.Modal.getInstance(document.getElementById('newCampaignModal'))?.hide();
                    campaignForm.reset();
                    updateMediaPreview();
                    campaignForm.classList.remove('was-validated');
                    if (scheduleSelect) dateContainer.style.display = 'none';
                    if (formData.scheduledTime <= new Date()) return axios.post(apiUrl(`campaigns/${response.data._id}/send`));
                    return null;
                })
                .then(() => loadCampaigns())
                .catch(error => {
                    console.error('Error creating campaign:', error);
                    showToast('Failed to create campaign', 'danger');
                })
                .finally(() => {
                    campaignSpinner.classList.add('d-none');
                    document.getElementById('save-campaign').disabled = false;
                });
        });

        document.getElementById('ai-generate-campaign')?.addEventListener('click', generateCampaignContent);
        document.getElementById('ai-generate-media')?.addEventListener('click', generateMediaSuggestion);
        mediaFields.forEach(id => document.getElementById(id)?.addEventListener('input', updateMediaPreview));
        document.getElementById('campaign-search')?.addEventListener('input', e => {
            const term = e.target.value.toLowerCase();
            renderCampaigns(allCampaigns.filter(campaign => `${campaign.name} ${campaign.heading}`.toLowerCase().includes(term)));
        });
        document.getElementById('journey-form')?.addEventListener('submit', saveJourney);
        document.getElementById('run-journey')?.addEventListener('click', runLatestJourney);
        document.getElementById('ai-journey-template')?.addEventListener('click', generateJourneyTemplate);
        document.getElementById('ai-suggest-btn')?.addEventListener('click', generateAISegmentRecommendations);
    }

    async function generateCampaignContent() {
        const btn = document.getElementById('ai-generate-campaign');
        const brand = document.getElementById('campaign-brand').value || 'modern retail brand';
        const offer = document.getElementById('campaign-offer').value || 'limited time customer offer';
        await withAsyncButton(btn, async () => {
            const prompt = `Create campaign content as strict JSON with keys name, subject, message, mediaTitle, mediaAlt, mediaCaption for this brand: ${brand}. Offer: ${offer}. Keep message under 80 words.`;
            const data = await askPuterForJson(prompt, fallbackCampaignJson(brand, offer));
            document.getElementById('campaign-name').value = data.name || 'AI Generated Campaign';
            document.getElementById('campaign-subject').value = data.subject || data.heading || offer;
            document.getElementById('campaign-message').value = data.message || '';
            document.getElementById('media-type').value = 'banner';
            document.getElementById('media-title').value = data.mediaTitle || offer;
            document.getElementById('media-alt').value = data.mediaAlt || data.mediaTitle || offer;
            document.getElementById('media-caption').value = data.mediaCaption || '';
            updateMediaPreview();
            showToast('AI content added to the campaign.', 'success');
        });
    }

    async function generateMediaSuggestion() {
        const offer = document.getElementById('campaign-offer').value || document.getElementById('campaign-subject').value || 'Special Offer';
        const prompt = `Suggest rich media for a marketing campaign as strict JSON with keys type, title, altText, caption. Use type banner, image, or creative. Offer: ${offer}`;
        const data = await askPuterForJson(prompt, {
            type: 'banner',
            title: offer,
            altText: `Promotional banner for ${offer}`,
            caption: 'A bold creative matched to the campaign offer.',
        });
        document.getElementById('media-type').value = data.type || 'banner';
        document.getElementById('media-title').value = data.title || offer;
        document.getElementById('media-alt').value = data.altText || '';
        document.getElementById('media-caption').value = data.caption || '';
        updateMediaPreview();
    }

    async function generateJourneyTemplate() {
        const type = document.getElementById('journey-type').value;
        const data = await askPuterForJson(`Create an automated ${type} journey template as strict JSON with keys name, heading, message. Use {{firstName}} for personalization.`, {
            name: 'Birthday Delight Journey',
            heading: 'Happy Birthday, {{firstName}}!',
            message: 'Your birthday treat is ready. Enjoy 20% off today and make the celebration brighter.',
        });
        document.getElementById('journey-name').value = data.name || '';
        document.getElementById('journey-heading').value = data.heading || '';
        document.getElementById('journey-message').value = data.message || '';
        showToast('Journey template generated.', 'success');
    }

    async function generateAISegmentRecommendations() {
        const btn = document.getElementById('ai-suggest-btn');
        await withAsyncButton(btn, async () => {
            const prompt = 'Suggest 3 marketing segments as strict JSON array. Each item needs name, description, offer, filters with minSpend, minVisits, inactivityMonths.';
            const suggestions = await askPuterForJson(prompt, fallbackSegments());
            renderAISuggestions(Array.isArray(suggestions) ? suggestions : fallbackSegments());
        });
    }

    async function askPuterForJson(prompt, fallback) {
        if (!window.puter?.ai?.chat) return fallback;
        try {
            const response = await window.puter.ai.chat(prompt, { model: 'gemini-3-flash-preview' });
            const text = typeof response === 'string' ? response : (response?.text || String(response));
            return JSON.parse(text.replace(/```json|```/g, '').trim());
        } catch (error) {
            console.warn('Puter AI fallback used:', error);
            return fallback;
        }
    }

    function saveJourney(e) {
        e.preventDefault();
        const payload = {
            name: document.getElementById('journey-name').value,
            type: document.getElementById('journey-type').value,
            channel: document.getElementById('journey-channel').value,
            trigger: {
                event: document.getElementById('journey-type').value,
                timeOfDay: document.getElementById('journey-time').value,
            },
            template: {
                heading: document.getElementById('journey-heading').value,
                message: document.getElementById('journey-message').value,
                media: readMediaForm(),
            },
        };

        axios.post(apiUrl('journeys'), payload)
            .then(response => {
                latestJourneyId = response.data._id;
                document.getElementById('run-journey').disabled = false;
                showToast('Journey saved and activated.', 'success');
                loadJourneys();
            })
            .catch(error => {
                console.error('Journey save failed:', error);
                showToast('Failed to save journey', 'danger');
            });
    }

    function loadJourneys() {
        axios.get(apiUrl('journeys'))
            .then(response => {
                const journeys = response.data || [];
                const list = document.getElementById('journeys-list');
                if (!journeys.length) {
                    list.innerHTML = '<tr><td colspan="6" class="text-muted py-3">No journeys created yet.</td></tr>';
                    return;
                }
                latestJourneyId = journeys[0]._id;
                document.getElementById('run-journey').disabled = false;
                list.innerHTML = journeys.map(journey => `
                    <tr>
                        <td><strong>${escapeHtml(journey.name)}</strong><div class="small text-muted">${escapeHtml(journey.template?.heading || '')}</div></td>
                        <td>${escapeHtml(journey.type)}</td>
                        <td>${escapeHtml(journey.channel)}</td>
                        <td><span class="badge bg-success">${journey.status}</span></td>
                        <td>${journey.runStats?.sent || 0}</td>
                        <td>${journey.runStats?.lastRunAt ? formatDate(journey.runStats.lastRunAt) : 'Not run'}</td>
                    </tr>
                `).join('');
            })
            .catch(() => {
                document.getElementById('journeys-list').innerHTML = errorRow('Failed to load journeys.', 6);
            });
    }

    function runLatestJourney() {
        if (!latestJourneyId) return;
        axios.post(apiUrl(`journeys/${latestJourneyId}/run`))
            .then(response => {
                showToast(`Journey sent to ${response.data.sent || 0} customers.`, 'success');
                loadJourneys();
            })
            .catch(error => {
                console.error('Journey run failed:', error);
                showToast('Failed to run journey', 'danger');
            });
    }

    function renderAISuggestions(suggestions) {
        const container = document.getElementById('ai-suggestions-container');
        if (!container) return;
        container.innerHTML = suggestions.map(suggestion => `
            <div class="col-md-4 mb-4">
                <div class="card ai-segment-card h-100">
                    <div class="card-header"><h5 class="mb-0">${escapeHtml(suggestion.name)}</h5></div>
                    <div class="card-body">
                        <p class="text-muted">${escapeHtml(suggestion.description)}</p>
                        <div class="mb-3 p-3 bg-light rounded">
                            <h6 class="text-success">Recommended Offer</h6>
                            <p class="mb-0">${escapeHtml(suggestion.offer)}</p>
                        </div>
                        <div class="d-flex flex-wrap gap-2">
                            <span class="badge bg-light text-dark">$${suggestion.filters?.minSpend || 0}+ spend</span>
                            <span class="badge bg-light text-dark">${suggestion.filters?.minVisits || 0}+ visits</span>
                            <span class="badge bg-light text-dark">${suggestion.filters?.inactivityMonths || 0}m inactive</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function readMediaForm() {
        return {
            type: document.getElementById('media-type').value,
            title: document.getElementById('media-title').value,
            url: document.getElementById('media-url').value,
            altText: document.getElementById('media-alt').value,
            caption: document.getElementById('media-caption').value,
        };
    }

    function updateMediaPreview() {
        document.getElementById('campaign-media-preview').innerHTML = renderMediaPreview(readMediaForm()) || '<div class="text-muted">Media preview will appear here.</div>';
    }

    function renderMediaPreview(media = {}) {
        if (!media.type || media.type === 'none') return '';
        const title = escapeHtml(media.title || 'Campaign creative');
        const caption = escapeHtml(media.caption || 'Rich media creative');
        if (media.url) {
            return `<figure class="campaign-rich-media"><img src="${escapeAttribute(media.url)}" alt="${escapeAttribute(media.altText || title)}"><figcaption>${caption}</figcaption></figure>`;
        }
        return `<div class="generated-media-banner"><div><span>${escapeHtml(media.type)}</span><strong>${title}</strong><small>${caption}</small></div></div>`;
    }

    function fallbackCampaignJson(brand, offer) {
        return {
            name: `${offer} Campaign`,
            subject: `Your ${offer} is ready`,
            message: `Hi {{firstName}}, ${brand} picked something special for you. Claim ${offer} before it ends.`,
            mediaTitle: offer,
            mediaAlt: `Promotional creative for ${offer}`,
            mediaCaption: 'Personalized offer creative',
        };
    }

    function fallbackSegments() {
        return [
            { name: 'High Intent Shoppers', description: 'Customers with repeat visits and strong purchase signals.', offer: 'Early access plus 15% off', filters: { minSpend: 500, minVisits: 4, inactivityMonths: 0 } },
            { name: 'Win Back Customers', description: 'Previously active customers who have gone quiet.', offer: 'We miss you reward', filters: { minSpend: 100, minVisits: 1, inactivityMonths: 3 } },
            { name: 'Premium Loyalists', description: 'Top spenders likely to respond to exclusives.', offer: 'VIP bundle offer', filters: { minSpend: 1000, minVisits: 5, inactivityMonths: 0 } },
        ];
    }

    function withButtonLoading(btn, label, task) {
        if (!btn) return task();
        const original = btn.innerHTML;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> ${label}`;
        btn.disabled = true;
        return task().catch(error => {
            console.error(error);
            showToast('Action failed. Please try again.', 'danger');
        }).finally(() => {
            btn.innerHTML = original;
            btn.disabled = false;
        });
    }

    async function withAsyncButton(btn, task) {
        const spinner = btn?.querySelector('.spinner-border');
        spinner?.classList.remove('d-none');
        if (btn) btn.disabled = true;
        try {
            await task();
        } catch (error) {
            console.error(error);
            showToast('AI generation failed. Fallback content was used where possible.', 'warning');
        } finally {
            spinner?.classList.add('d-none');
            if (btn) btn.disabled = false;
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '1080';
        toast.innerHTML = `
            <div class="toast show" role="alert">
                <div class="toast-header bg-${type} ${type === 'warning' ? 'text-dark' : 'text-white'}">
                    <strong class="me-auto">${type === 'danger' ? 'Error' : 'MarketPro'}</strong>
                    <button type="button" class="btn-close ${type === 'warning' ? '' : 'btn-close-white'}" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">${escapeHtml(message)}</div>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function getStatusBadgeClass(status = '') {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-success';
            case 'scheduled': return 'bg-info';
            case 'processing': return 'bg-primary';
            case 'failed': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    function getDeliveryBadgeClass(status = '') {
        switch (status) {
            case 'DELIVERED':
            case 'RETRIED':
            case 'SENT': return 'bg-success';
            case 'FAILED': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    function errorRow(message, colspan) {
        return `<tr><td colspan="${colspan}" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle fs-4"></i><p class="mt-2">${escapeHtml(message)}</p></td></tr>`;
    }

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }

    function escapeAttribute(value = '') {
        return escapeHtml(value).replaceAll('`', '&#96;');
    }

    window.loadCampaigns = loadCampaigns;
});
