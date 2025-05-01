document.addEventListener('DOMContentLoaded', function() {
    // Initialize segments
    initSegments();
});

function initSegments() {
    // First make sure the table body exists
    const segmentTableBody = document.getElementById('segment-list');
    if (!segmentTableBody) {
        console.error('Segment table body not found in DOM');
        return;
    }

    // Then load segments
    loadSegments();

    // Setup form submission if form exists
    const segmentForm = document.getElementById('segment-form');
    if (segmentForm) {
        segmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSegmentSubmit();
        });
    }
}

function loadSegments() {
    const segmentTableBody = document.getElementById('segment-list');
    
    // First check if table body exists
    if (!segmentTableBody) {
        console.error('Cannot load segments - table body not found');
        return;
    }

    // Show loading state
    segmentTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading segments...</p>
            </td>
        </tr>
    `;

    // Load segments from API
    axios.get('https://cmr-1-p1qb.onrender.com/api/segments')
        .then(function(response) {
            if (response.data && Array.isArray(response.data)) {
                renderSegmentList(response.data);
            } else {
                throw new Error('Invalid data format received');
            }
        })
        .catch(function(error) {
            console.error('Segment load error:', error);
            showSegmentError('Failed to load segments. Please try again.');
        });
}

function handleSegmentSubmit() {
    const form = document.getElementById('segment-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Validate form
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    // Prepare data
    const segmentData = {
        name: document.getElementById('segment-name').value,
        filter_conditions: {
            minSpends: parseInt(document.getElementById('min-spends').value) || 0,
            minVisits: parseInt(document.getElementById('min-visits').value) || 0,
            noVisitMonths: parseInt(document.getElementById('inactive-months').value) || 0
        }
    };

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status"></span>
        Saving...
    `;

    axios.post('https://cmr-1-p1qb.onrender.com/api/segments', segmentData)
        .then(function(response) {
            if (response.data && response.data._id) {
                // Success - reload segments and reset form
                loadSegments();
                form.reset();
                form.classList.remove('was-validated');
                showToast('Segment created successfully!', 'success');
            } else {
                throw new Error('Invalid response data');
            }
        })
        .catch(function(error) {
            console.error('Segment creation error:', error);
            showToast('Failed to create segment. Please try again.', 'danger');
        })
        .finally(function() {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
}

function renderSegmentList(segments) {
    const segmentTableBody = document.getElementById('segment-list');
    
    if (!segments || segments.length === 0) {
        segmentTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="bi bi-collection text-muted fs-4"></i>
                    <p class="mt-2">No segments found</p>
                    <button class="btn btn-sm btn-primary" onclick="document.getElementById('segment-name').focus()">
                        <i class="bi bi-plus-lg"></i> Create Your First Segment
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    segmentTableBody.innerHTML = segments.map(function(segment) {
        const segmentType = classifySegmentType(segment);
        const description = generateSegmentDescription(segment);
        const lastUpdated = formatRelativeDate(segment.updatedAt || segment.createdAt);

        return `
            <tr>
                <td>
                    <strong>${segment.name || 'Unnamed Segment'}</strong>
                    <span class="badge ${getBadgeClassForType(segmentType)} ms-2">${segmentType}</span>
                </td>
                <td>${description}</td>
                <td>${estimateCustomerCount(segment)}</td>
                <td>${lastUpdated}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="showSegmentDetails('${segment._id}')">
                        <i class="bi bi-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function showSegmentDetails(segmentId) {
    axios.get(`https://cmr-1-p1qb.onrender.com/api/segments/${segmentId}`)
        .then(function(response) {
            const segment = response.data;
            // Show in modal or alert
            alert(`Segment Details\n\nName: ${segment.name}\nType: ${classifySegmentType(segment)}\nDescription: ${generateSegmentDescription(segment)}`);
        })
        .catch(function(error) {
            console.error('Segment details error:', error);
            showToast('Failed to load segment details', 'danger');
        });
}

function showSegmentError(message) {
    const segmentTable = document.querySelector('#segment-list tbody');
    segmentTable.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4 text-danger">
                <i class="bi bi-exclamation-triangle fs-4"></i>
                <p class="mt-2">${message}</p>
                <button class="btn btn-sm btn-outline-primary" onclick="loadSegments()">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </td>
        </tr>
    `;
}

// Helper functions
function classifySegmentType(segment) {
    if (!segment.name) return 'Custom';
    if (segment.name.toLowerCase().includes('inactive')) return 'At Risk';
    if (segment.name.toLowerCase().includes('premium')) return 'High Value';
    if (segment.name.toLowerCase().includes('jeans')) return 'Product';
    return 'Custom';
}

function generateSegmentDescription(segment) {
    const cond = segment.filter_conditions || {};
    if (cond.minSpends > 1000) return "Customers with LTV > $1000";
    if (cond.noVisitMonths >= 3) return "No purchases in last 3 months";
    if (segment.name.toLowerCase().includes('jeans')) return "Customers who purchased jeans";
    return "Custom segment";
}

function estimateCustomerCount(segment) {
    // Simple estimation logic - replace with real data if available
    const cond = segment.filter_conditions || {};
    if (cond.minSpends > 1000) return Math.floor(Math.random() * 100) + 50;
    if (cond.noVisitMonths >= 3) return Math.floor(Math.random() * 200) + 30;
    return Math.floor(Math.random() * 300) + 100;
}

function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    return `${Math.floor(diffDays / 7)} weeks ago`;
}

function getBadgeClassForType(type) {
    const classes = {
        'High Value': 'bg-primary bg-opacity-10 text-primary',
        'At Risk': 'bg-warning bg-opacity-10 text-warning',
        'Product': 'bg-info bg-opacity-10 text-info',
        'Custom': 'bg-secondary bg-opacity-10 text-secondary'
    };
    return classes[type] || classes['Custom'];
}

function showToast(message, type) {
    // Implement your toast notification system or use alert as fallback
    alert(`${type.toUpperCase()}: ${message}`);
}