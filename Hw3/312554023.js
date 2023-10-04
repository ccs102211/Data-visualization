fetch('abalone.data')
  .then(response => response.text())
  .then(data => {
    const rows = data.split('\n').filter(line => line.trim() !== '').map(line => line.split(','));

    const featureMap = {
      Sex: 0,
      Length: 1,
      Diameter: 2,
      Height: 3,
      Whole_weight: 4,
      Shucked_weight: 5,
      Viscera_weight: 6,
      Shell_weight: 7,
      Rings: 8
    };

    const numericalSex = rows.map(row => {
      switch (row[featureMap.Sex]) {
        case 'M': return 1;
        case 'F': return 2;
        case 'I': return 3;
        default: return null;
      }
    });

    let correlations = {};
    for (let feature in featureMap) {
      if (feature !== 'Sex') {
        const featureValues = rows.map(row => parseFloat(row[featureMap[feature]]));
        const correlation = calculatePearsonCorrelation(numericalSex, featureValues);
        correlations[feature] = correlation;
      }
    }

    document.getElementById('results').textContent = JSON.stringify(correlations, null, 2);
  })
  .catch(error => console.error("Error:", error));

function calculatePearsonCorrelation(arr1, arr2) {
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < arr1.length; i++) {
    numerator += (arr1[i] - mean1) * (arr2[i] - mean2);
    denominator1 += Math.pow(arr1[i] - mean1, 2);
    denominator2 += Math.pow(arr2[i] - mean2, 2);
  }

  return numerator / (Math.sqrt(denominator1) * Math.sqrt(denominator2));
}

function mean(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}
