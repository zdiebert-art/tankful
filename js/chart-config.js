/* ============================================
   TANKFUL — Chart Configuration
   ApexCharts gradient area chart
   ============================================ */

const TANKFUL_Chart = (() => {

  let chartInstance = null;

  function getThemeColors() {
    const styles = getComputedStyle(document.body);
    return {
      c2: styles.getPropertyValue('--c-2').trim(),
      c3: styles.getPropertyValue('--c-3').trim(),
      c4: styles.getPropertyValue('--c-4').trim(),
      text: styles.getPropertyValue('--text').trim(),
      textSoft: styles.getPropertyValue('--text-soft').trim()
    };
  }

  function formatDateLabel(dateStr, rangeDays) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parts = dateStr.split('-');
    const m = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (rangeDays === 365) {
      const yr = parts[0].slice(2);
      return `${months[m - 1]} '${yr}`;
    }
    return `${months[m - 1]} ${day}`;
  }

  function render(history, rangeDays) {
    const colors = getThemeColors();
    // Data is just y-values — categories array provides the x-axis labels.
    // (Previously passed {x, y} objects but ApexCharts was using x.date as the label.)
    const data = history.map(h => h.price);

    const options = {
      chart: {
        type: 'area',
        height: 240,
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: 'Poppins, sans-serif',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: { enabled: true, delay: 80 },
          dynamicAnimation: { enabled: true, speed: 500 }
        },
        sparkline: { enabled: false },
        background: 'transparent'
      },
      series: [{
        name: 'Kelowna ¢/L',
        data
      }],
      stroke: {
        curve: 'smooth',
        width: 3,
        colors: [colors.c4]
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.55,
          opacityTo: 0.05,
          stops: [0, 95],
          colorStops: [
            { offset: 0, color: colors.c4, opacity: 0.55 },
            { offset: 100, color: colors.c2, opacity: 0.05 }
          ]
        }
      },
      dataLabels: { enabled: false },
      markers: {
        size: 0,
        strokeWidth: 0,
        hover: { size: 6, sizeOffset: 3 }
      },
      grid: {
        borderColor: 'rgba(0,0,0,0.06)',
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 0, bottom: 0 },
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } }
      },
      xaxis: {
        type: 'category',
        categories: history.map(h => formatDateLabel(h.date, rangeDays)),
        labels: {
          style: {
            colors: colors.textSoft,
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'Poppins, sans-serif'
          },
          rotate: 0,
          hideOverlappingLabels: true
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: rangeDays === 7 ? 7 : (rangeDays === 30 ? 6 : 6)
      },
      yaxis: {
        labels: {
          style: {
            colors: colors.textSoft,
            fontSize: '11px',
            fontWeight: 500,
            fontFamily: 'Poppins, sans-serif'
          },
          formatter: (v) => `${Math.round(v)}¢`
        },
        forceNiceScale: true
      },
      tooltip: {
        x: {
          formatter: (_, opts) => {
            const idx = opts.dataPointIndex;
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const parts = history[idx].date.split('-').map(Number);
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            const wd = weekdays[dateObj.getDay()];
            const mn = months[parts[1] - 1];
            const yr = rangeDays === 365 ? `, ${parts[0]}` : '';
            return `${wd}, ${mn} ${parts[2]}${yr}`;
          }
        },
        y: {
          formatter: (v) => `${v.toFixed(1)} ¢/L`
        },
        marker: { show: false },
        style: { fontFamily: 'Poppins, sans-serif' }
      }
    };

    if (chartInstance) {
      chartInstance.updateOptions(options, true, true);
    } else {
      chartInstance = new ApexCharts(document.querySelector('#chart'), options);
      chartInstance.render();
    }

    // Update legend
    const prices = history.map(h => h.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const legendEl = document.getElementById('chartLegend');
    if (legendEl) {
      legendEl.innerHTML = `
        <span class="low">Low ${lo.toFixed(1)}¢</span>
        <span>Avg ${(prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(1)}¢</span>
        <span class="high">High ${hi.toFixed(1)}¢</span>
      `;
    }
  }

  function refreshTheme() {
    // Re-render with current theme colors
    if (!chartInstance) return;
    const activeTab = document.querySelector('.tab.active');
    const rangeDays = activeTab ? parseInt(activeTab.dataset.range, 10) : 7;
    render(TANKFUL_MOCK.history[rangeDays], rangeDays);
  }

  return { render, refreshTheme };
})();
