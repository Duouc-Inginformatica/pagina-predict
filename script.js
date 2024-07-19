document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded');

    const predictionForm = document.getElementById('predictionForm');
    const resultDiv = document.getElementById('result');
    const dashboardSection = document.getElementById('dashboard-section');
    const mapSection = document.getElementById('map-section');
    const historicalSummary = document.getElementById('historical-summary');
    const summaryTableBody = document.getElementById('summary-table-body');
    const mapTableBody = document.getElementById('map-table-body');
    let historicalChart = null;
    let mapInitialized = false;
    let map;
    let markers = [];

    const australiaBounds = {
        north: -9.2295,
        south: -43.7405,
        west: 112.9211,
        east: 153.6383
    };

    // Function to initialize the map
    function initializeMap() {
        if (!mapInitialized) {
            map = L.map('map').setView([-25.2744, 133.7751], 4);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Add additional controls (example: layer control)
            const baseMaps = {
                "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
            };
            const overlayMaps = {
                "Markers": L.layerGroup()
            };

            L.control.layers(baseMaps, overlayMaps).addTo(map);

            map.on('click', async (e) => {
                const { lat, lng } = e.latlng;

                if (!isWithinAustralia(lat, lng)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Coordenadas fuera de Australia',
                        text: 'Las coordenadas seleccionadas están fuera de Australia. Por favor, seleccione un punto dentro de Australia.',
                        confirmButtonText: 'Entendido'
                    });
                    return;
                }

                try {
                    const response = await fetch('https://a3bac4c8-67d5-48fb-8e72-daa8c529c4ea-00-lhyu1igjsyhm.worf.repl.co/predict_regression', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ data: { latitude: lat, longitude: lng } })
                    });

                    if (response.ok) {
                        const data = await response.json();

                        // Remove previous markers
                        markers.forEach(marker => map.removeLayer(marker));
                        markers = [];

                        // Add new marker
                        const marker = L.marker([lat, lng]).addTo(map)
                            .bindPopup(`<b>Predicción:</b> ${data.prediction}`)
                            .openPopup();
                        markers.push(marker);

                        // Determine if it rains or not based on prediction
                        const rains = data.prediction > 0 ? "Sí" : "No";

                        // Update table with new prediction
                        const today = new Date();
                        mapTableBody.innerHTML = '';
                        for (let i = 0; i < 4; i++) {
                            const date = new Date(today);
                            date.setDate(today.getDate() + i);
                            const formattedDate = date.toISOString().split('T')[0];
                            mapTableBody.innerHTML += `
                                <tr>
                                    <td>${formattedDate}</td>
                                    <td>${rains}</td>
                                </tr>
                            `;
                        }
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error en la predicción',
                            text: `Hubo un problema al realizar la predicción: ${response.statusText}`,
                            footer: '<a href>¿Por qué tengo este problema?</a>',
                            confirmButtonText: 'Reintentar',
                            showCancelButton: true,
                            cancelButtonText: 'Cancelar'
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error en la predicción',
                        text: `Hubo un problema al realizar la predicción: ${error.message}`,
                        footer: '<a href>¿Por qué tengo este problema?</a>',
                        confirmButtonText: 'Reintentar',
                        showCancelButton: true,
                        cancelButtonText: 'Cancelar'
                    });
                }
            });

            mapInitialized = true;
        }
    }

    function isWithinAustralia(lat, lng) {
        return lat <= australiaBounds.north && lat >= australiaBounds.south && lng >= australiaBounds.west && lng <= australiaBounds.east;
    }

    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const temperature = document.getElementById('temperature').value;
        const humidity = document.getElementById('humidity').value;

        if (!temperature || !humidity) {
            Swal.fire({
                icon: 'warning',
                title: 'Datos faltantes',
                text: 'Por favor, ingrese todos los datos requeridos.',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        try {
            const response = await fetch('https://a3bac4c8-67d5-48fb-8e72-daa8c529c4ea-00-lhyu1igjsyhm.worf.repl.co/predict_regression', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: { temperature, humidity } })
            });

            if (response.ok) {
                const data = await response.json();
                resultDiv.innerHTML = `<p>Predicción: ${data.prediction}</p>`;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error en la predicción',
                    text: `Hubo un problema al realizar la predicción: ${response.statusText}`,
                    footer: '<a href>¿Por qué tengo este problema?</a>',
                    confirmButtonText: 'Reintentar',
                    showCancelButton: true,
                    cancelButtonText: 'Cancelar'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error en la predicción',
                text: `Hubo un problema al realizar la predicción: ${error.message}`,
                footer: '<a href>¿Por qué tengo este problema?</a>',
                confirmButtonText: 'Reintentar',
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
            });
        }
    });

    // Función para cargar los datos históricos y mostrar resumen
    async function loadHistoricalData() {
        try {
            const response = await fetch('https://a3bac4c8-67d5-48fb-8e72-daa8c529c4ea-00-lhyu1igjsyhm.worf.repl.co/historical_data');

            if (response.ok) {
                const data = await response.json();

                if (historicalChart) {
                    historicalChart.destroy();
                }

                const ctx = document.getElementById('historicalDataChart').getContext('2d');
                historicalChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(item => item.Date),
                        datasets: [{
                            label: 'Temperatura Mínima',
                            data: data.map(item => item.MinTemp),
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            fill: false
                        }, {
                            label: 'Temperatura Máxima',
                            data: data.map(item => item.MaxTemp),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            fill: false
                        }, {
                            label: 'Precipitación',
                            data: data.map(item => item.Rainfall),
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            fill: false
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });

                // Calcular el día con más lluvia y otros datos relevantes
                const maxRainfall = Math.max(...data.map(item => item.Rainfall));
                const dayWithMostRain = data.find(item => item.Rainfall === maxRainfall);

                summaryTableBody.innerHTML = `
                    <tr>
                        <td>Día con más lluvia</td>
                        <td>${dayWithMostRain.Date} (${maxRainfall} mm)</td>
                    </tr>
                    <tr>
                        <td>Promedio de Temperatura Mínima</td>
                        <td>${average(data.map(item => item.MinTemp)).toFixed(2)} °C</td>
                    </tr>
                    <tr>
                        <td>Promedio de Temperatura Máxima</td>
                        <td>${average(data.map(item => item.MaxTemp)).toFixed(2)} °C</td>
                    </tr>
                `;
            } else {
                console.error('Error al obtener datos históricos:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error al obtener datos históricos:', error);
        }
    }

    // Función para calcular el promedio
    function average(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    // Navigation event handlers
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('home-section').style.display = 'block';
        document.getElementById('form-section').style.display = 'none';
        dashboardSection.style.display = 'none';
        mapSection.style.display = 'none';
    });

    document.getElementById('nav-form').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('home-section').style.display = 'none';
        document.getElementById('form-section').style.display = 'block';
        dashboardSection.style.display = 'none';
        mapSection.style.display = 'none';
    });

    document.getElementById('nav-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('home-section').style.display = 'none';
        document.getElementById('form-section').style.display = 'none';
        dashboardSection.style.display = 'block';
        mapSection.style.display = 'none';
        loadHistoricalData();
    });

    document.getElementById('nav-map').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('home-section').style.display = 'none';
        document.getElementById('form-section').style.display = 'none';
        dashboardSection.style.display = 'none';
        mapSection.style.display = 'block';
        initializeMap();
    });
});














