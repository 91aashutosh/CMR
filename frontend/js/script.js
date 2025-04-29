document.addEventListener('DOMContentLoaded', async () => {
    // Load segments
    await loadSegments();

    // Segment form submission
    document.getElementById('segment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createSegment();
    });

    // AI Recommendations button
    document.getElementById('ai-recommend').addEventListener('click', async () => {
        await getAIRecommendations();
    });

    // Use Segment button in modal
    document.getElementById('use-segment').addEventListener('click', () => {
        const segmentId = document.getElementById('segmentModal').dataset.segmentId;
        window.location.href = `campaigns.html?segmentId=${segmentId}`;
    });
});

async function loadSegments() {
    try {
        const response = await axios.get('https://cmr-1-p1qb.onrender.com/api/segments');
        const segments = response.data;
        const segmentList = document.getElementById('segment-list');
        
        segmentList.innerHTML = segments.map(segment => `
            <a href="#" class="list-group-item list-group-item-action" data-id="${segment._id}">
                <h5>${segment.name}</h5>
                <small>Created: ${new Date(segment.createdAt).toLocaleDateString()}</small>
                <button class="btn btn-sm btn-outline-primary float-end view-details">Details</button>
            </a>
        `).join('');

        // Add event listeners to the details buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const segmentId = button.closest('a').dataset.id;
                await showSegmentDetails(segmentId);
            });
        });

        // Add event listeners to the segment items
        document.querySelectorAll('#segment-list a').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const segmentId = item.dataset.id;
                await showSegmentDetails(segmentId);
            });
        });
    } catch (error) {
        console.error('Error loading segments:', error);
        alert('Failed to load segments');
    }
}

async function createSegment() {
    const name = document.getElementById('segment-name').value;
    const minSpends = document.getElementById('min-spends').value;
    const minVisits = document.getElementById('min-visits').value;
    const inactiveMonths = document.getElementById('inactive-months').value;

    const filterConditions = {};
    if (minSpends) filterConditions.minSpends = parseInt(minSpends);
    if (minVisits) filterConditions.minVisits = parseInt(minVisits);
    if (inactiveMonths) {
        const date = new Date();
        date.setMonth(date.getMonth() - parseInt(inactiveMonths));
        filterConditions.noVisitMonths = date;
    }

    try {
        const response = await axios.post('https://cmr-1-p1qb.onrender.com/api/segments', {
            name,
            filter_conditions: filterConditions
        });
        await loadSegments();
        document.getElementById('segment-form').reset();
        alert('Segment created successfully!');
    } catch (error) {
        console.error('Error creating segment:', error);
        alert('Failed to create segment');
    }
}

async function showSegmentDetails(segmentId) {
    try {
        const [segmentResponse, countResponse] = await Promise.all([
            axios.get(`https://cmr-1-p1qb.onrender.com/api/segments/${segmentId}`),
            axios.get(`https://cmr-1-p1qb.onrender.com/api/segments/customersCount/${segmentId}`)
        ]);

        const segment = segmentResponse.data;
        const customerCount = countResponse.data.count;

        const modal = document.getElementById('segmentModal');
        modal.dataset.segmentId = segmentId;

        document.getElementById('segment-details').innerHTML = `
            <h4>${segment.name}</h4>
            <p><strong>Customer Count:</strong> ${customerCount}</p>
            <h5 class="mt-3">Filter Conditions:</h5>
            <pre>${JSON.stringify(segment.filter_conditions, null, 2)}</pre>
        `;

        new bootstrap.Modal(modal).show();
    } catch (error) {
        console.error('Error loading segment details:', error);
        alert('Failed to load segment details');
    }
}

async function getAIRecommendations() {
    try {
        const aiPanel = document.getElementById('ai-panel');
        aiPanel.classList.remove('d-none');
        
        document.getElementById('ai-results').innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>Generating AI recommendations...</p>
            </div>
        `;

        // Call AI service
        const recommendations = await generateAISegmentRecommendations();
        
        document.getElementById('ai-results').innerHTML = `
            <h5>Recommended Segments:</h5>
            <div class="list-group mt-3">
                ${recommendations.map(rec => `
                    <div class="list-group-item">
                        <h6>${rec.name}</h6>
                        <p>${rec.description}</p>
                        <button class="btn btn-sm btn-success apply-recommendation" 
                                data-spends="${rec.filters.minSpends || ''}"
                                data-visits="${rec.filters.minVisits || ''}"
                                data-months="${rec.filters.noVisitMonths || ''}">
                            Apply
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Add event listeners to apply buttons
        document.querySelectorAll('.apply-recommendation').forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('min-spends').value = button.dataset.spends;
                document.getElementById('min-visits').value = button.dataset.visits;
                document.getElementById('inactive-months').value = button.dataset.months;
                aiPanel.classList.add('d-none');
            });
        });
    } catch (error) {
        console.error('Error getting AI recommendations:', error);
        document.getElementById('ai-results').innerHTML = `
            <div class="alert alert-danger">Failed to get AI recommendations</div>
        `;
    }
}