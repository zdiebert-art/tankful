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
    const realData = history.map(h => (h.price == null ? null : h.price));

    // Find the first real (non-null) data point. Everything before it is
    // the "pre-tracking" period and gets the washed dashed line.
    let firstRealIdx = -1;
    for (let i = 0; i < history.length; i++) {
      if (history[i] && history[i].price != null) { firstRealIdx = i; break; }
    }
    const hasPlaceholder = firstRealIdx > 0;

    // Placeholder series: flat at the first real price from index 0 to
    // firstRealIdx (inclusive) so the dashed line visually meets the
    // real-data line at the start of tracking.
    let placeholderData = null;
    if (hasPlaceholder) {
      const firstRealPrice = history[firstRealIdx].price;
      placeholderData = history.map((h, i) => (i <= firstRealIdx ? firstRealPrice : null));
    }

    const series = hasPlaceholder
      ? [
          { name: 'Market price', type: 'area', data: realData },
          { name: 'Tracking not yet started', type: 'line', data: placeholderData },
        ]
      : [
          { name: 'Market price', type: 'area', data: realData },
        ];

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
      series,
      stroke: {
        curve: 'smooth',
        // Per-series width + dash. Real line solid+thick, placeholder
        // line thinner and dashed for the "no data" look.
        width:     hasPlaceholder ? [3, 2]            : 3,
        dashArray: hasPlaceholder ? [0, 7]            : 0,
        colors:    hasPlaceholder ? [colors.c4, 'rgba(0,0,0,0.28)'] : [colors.c4]
      },
      fill: {
        // Real series gets the gradient fill; the placeholder line has
        // no fill (type: line on its series block already handles that,
        // but we set opacity 0 here too as a belt-and-suspenders).
        type:    hasPlaceholder ? ['gradient', 'solid'] : 'gradient',
        opacity: hasPlaceholder ? [1, 0] : 1,
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
        // Custom tooltip so the placeholder ("Tracking not yet started")
        // series doesn't lie about a real number — when the underlying
        // real-data point is null, we say "not tracked yet" instead.
        custom: ({ dataPointIndex }) => {
          const item = history[dataPointIndex];
          if (!item) return '';
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
          const parts = item.date.split('-').map(Number);
          const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
          const wd = weekdays[dateObj.getDay()];
          const mn = months[parts[1] - 1];
          const yr = rangeDays === 365 ? `, ${parts[0]}` : '';
          const dateLabel = `${wd}, ${mn} ${parts[2]}${yr}`;
          if (item.price == null) {
            return `<div class="apex-tooltip-custom"><div class="tt-date">${dateLabel}</div><div class="tt-empty">Not tracked yet</div></div>`;
          }
          return `<div class="apex-tooltip-custom"><div class="tt-date">${dateLabel}</div><div class="tt-value"><strong>${item.price.toFixed(1)}</strong> ¢/L</div></div>`;
        },
        style: { fontFamily: 'Poppins, sans-serif' }
      }
    };

    if (chartInstance) {
      chartInstance.updateOptions(options, true, true);
    } else {
      chartInstance = new ApexCharts(document.querySelector('#chart'), options);
      chartInstance.render();
    }

    // Update legend — only real (non-null) prices count; the washed
    // placeholder line isn't actual history and shouldn't move the
    // low/avg/high readouts.
    const prices = history.map(h => h.price).filter(p => p != null);
    const legendEl = document.getElementById('chartLegend');
    if (legendEl) {
      if (prices.length === 0) {
        legendEl.innerHTML = `<span class="admin-mute">Tracking hasn't started in this window yet.</span>`;
      } else {
        const lo = Math.min(...prices);
        const hi = Math.max(...prices);
        const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
        legendEl.innerHTML = `
          <span class="low">Low ${lo.toFixed(1)}¢</span>
          <span>Avg ${avg.toFixed(1)}¢</span>
          <span class="high">High ${hi.toFixed(1)}¢</span>
        `;
      }
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
