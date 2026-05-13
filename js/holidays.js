/* ============================================
   TANKFUL — BC Holidays & Long Weekends
   Returns the upcoming statutory holidays and long weekends in
   British Columbia, with a gas-price impact weighting.

   Impact scale (same units as score components):
     Victoria Day (May Long) ... +8  RV/camp season opener — heaviest spike
     BC Day, Labour Day       ... +6  Peak summer long weekends
     Canada Day               ... +5  Strong but day-of-week dependent
     NYE / New Year's Day     ... +5  Travel + holiday closures
     Easter (Fri+Mon)         ... +4  First spring long weekend
     Thanksgiving             ... +4  Last warm-weather long weekend
     Christmas / Boxing Day   ... +5  Travel + closures
     Family Day               ... +3
     Truth & Reconciliation   ... +2  (higher when it forms a long weekend)
     Remembrance Day          ... +2  (higher when it forms a long weekend)
   ============================================ */

const TANKFUL_Holidays = (() => {

  const DAY_MS = 86400000;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // ---------- Date helpers ----------
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function addDays(d, n) {
    return new Date(d.getTime() + n * DAY_MS);
  }
  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
  }

  // Nth occurrence of `weekday` in (year, month). month is 0-indexed.
  function nthWeekday(year, month, weekday, n) {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
  }

  // Latest `weekday` on or before (year, month, day).
  function lastWeekdayOnOrBefore(year, month, day, weekday) {
    const d = new Date(year, month, day);
    const offset = (d.getDay() - weekday + 7) % 7;
    return new Date(year, month, day - offset);
  }

  // Easter Sunday — anonymous Gregorian algorithm.
  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  // ---------- Format helpers ----------
  function fmtDate(d) {
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  function fmtRange(start, end) {
    if (start.getMonth() === end.getMonth()) {
      return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
    }
    return `${fmtDate(start)} – ${fmtDate(end)}`;
  }

  // ---------- Holiday catalogue for a given year ----------
  // Each entry: { name, date, impact, longWeekend: { start, end } | null,
  //              icon, blurb }
  function holidaysForYear(year) {
    const out = [];

    // New Year's Day — Jan 1
    {
      const date = new Date(year, 0, 1);
      out.push(makeStat({
        name: "New Year's Day",
        date,
        impact: 5,
        blurb: 'Holiday travel + closures push pump prices up'
      }));
    }

    // Family Day — 3rd Monday of February (always a long weekend)
    {
      const date = nthWeekday(year, 1, 1, 3);
      out.push(makeLong({
        name: 'Family Day',
        date,
        impact: 3,
        blurb: 'BC long weekend — moderate travel bump'
      }));
    }

    // Good Friday & Easter Monday — long weekend Fri→Mon
    {
      const easter = easterSunday(year);
      const goodFri = addDays(easter, -2);
      const easterMon = addDays(easter, 1);
      out.push({
        name: 'Easter long weekend',
        date: goodFri,
        impact: 4,
        longWeekend: { start: goodFri, end: easterMon },
        icon: 'calendar-days',
        blurb: 'First spring long weekend — Okanagan getaway traffic'
      });
    }

    // Victoria Day — Monday on or before May 24 (May Long)
    {
      const date = lastWeekdayOnOrBefore(year, 4, 24, 1);
      out.push(makeLong({
        name: 'Victoria Day (May Long)',
        date,
        impact: 8,
        blurb: 'RV & camping season opener — biggest fuel demand jump of the year'
      }));
    }

    // Canada Day — Jul 1 (long weekend only if it falls on Fri/Mon, otherwise std)
    {
      const date = new Date(year, 6, 1);
      const dow = date.getDay();
      if (dow === 1) {        // Monday — Sat–Mon long
        out.push(makeLong({
          name: 'Canada Day',
          date,
          impact: 6,
          blurb: 'Canada Day long weekend — peak summer road travel',
          startOffset: -2
        }));
      } else if (dow === 5) { // Friday — Fri–Sun long
        out.push(makeLong({
          name: 'Canada Day',
          date,
          impact: 6,
          blurb: 'Canada Day long weekend — peak summer road travel',
          startOffset: 0,
          endOffset: 2
        }));
      } else {
        out.push(makeStat({
          name: 'Canada Day',
          date,
          impact: 5,
          blurb: 'Midweek stat — closures may briefly reduce supply'
        }));
      }
    }

    // BC Day — 1st Monday of August (always a long weekend)
    {
      const date = nthWeekday(year, 7, 1, 1);
      out.push(makeLong({
        name: 'BC Day',
        date,
        impact: 6,
        blurb: 'Provincial long weekend — heavy interior + coastal travel'
      }));
    }

    // Labour Day — 1st Monday of September (always a long weekend)
    {
      const date = nthWeekday(year, 8, 1, 1);
      out.push(makeLong({
        name: 'Labour Day',
        date,
        impact: 6,
        blurb: 'Last summer long weekend — end-of-season RV trips'
      }));
    }

    // National Day for Truth & Reconciliation — Sep 30
    {
      const date = new Date(year, 8, 30);
      const dow = date.getDay();
      if (dow === 1 || dow === 5) {
        out.push(makeLong({
          name: 'Truth & Reconciliation Day',
          date,
          impact: 3,
          blurb: 'BC stat — long-weekend-adjacent travel',
          startOffset: dow === 1 ? -2 : 0,
          endOffset: dow === 1 ? 0 : 2
        }));
      } else {
        out.push(makeStat({
          name: 'Truth & Reconciliation Day',
          date,
          impact: 2,
          blurb: 'BC statutory holiday'
        }));
      }
    }

    // Thanksgiving — 2nd Monday of October (always a long weekend)
    {
      const date = nthWeekday(year, 9, 1, 2);
      out.push(makeLong({
        name: 'Thanksgiving',
        date,
        impact: 4,
        blurb: 'Fall long weekend — family travel, modest bump'
      }));
    }

    // Remembrance Day — Nov 11
    {
      const date = new Date(year, 10, 11);
      const dow = date.getDay();
      if (dow === 1 || dow === 5) {
        out.push(makeLong({
          name: 'Remembrance Day',
          date,
          impact: 3,
          blurb: 'Forms a long weekend — small travel uptick',
          startOffset: dow === 1 ? -2 : 0,
          endOffset: dow === 1 ? 0 : 2
        }));
      } else {
        out.push(makeStat({
          name: 'Remembrance Day',
          date,
          impact: 2,
          blurb: 'Midweek stat — limited price impact'
        }));
      }
    }

    // Christmas / Boxing Day block — Dec 25–26 (handle as one event)
    {
      const xmas = new Date(year, 11, 25);
      const boxing = new Date(year, 11, 26);
      // Span depends on weekdays; we conservatively cover Dec 24–26 minimum.
      const start = addDays(xmas, xmas.getDay() === 1 ? -2 : (xmas.getDay() === 0 ? -1 : -1));
      const end   = addDays(boxing, boxing.getDay() === 5 ? 2 : 0);
      out.push({
        name: 'Christmas & Boxing Day',
        date: xmas,
        impact: 5,
        longWeekend: { start, end },
        icon: 'calendar-days',
        blurb: 'Travel + closures — prices typically firm into the new year'
      });
    }

    return out;
  }

  // ---------- Builders for the common single-day-stat and Mon-anchored long shapes ----------
  function makeStat({ name, date, impact, blurb }) {
    return {
      name, date, impact,
      longWeekend: null,
      icon: 'flag',
      blurb
    };
  }
  function makeLong({ name, date, impact, blurb, startOffset, endOffset }) {
    // Default: Mon-anchored long weekend → Sat..Mon.
    const sOff = (typeof startOffset === 'number') ? startOffset : -2;
    const eOff = (typeof endOffset   === 'number') ? endOffset   : 0;
    return {
      name, date, impact,
      longWeekend: { start: addDays(date, sOff), end: addDays(date, eOff) },
      icon: 'calendar-days',
      blurb
    };
  }

  // ---------- Public: list upcoming events for the dashboard ----------
  // Returns an array of modifier-shaped objects ordered chronologically,
  // taken from "today" forward through `lookaheadDays`.
  //
  // Active rule: gas prices typically climb a few days before a long weekend,
  // so we mark a holiday active from (longWeekend.start - 3 days) through
  // longWeekend.end, or (date - 2 days) ... date for non-long-weekend stats.
  function upcoming(today, opts) {
    const now = startOfDay(today || new Date());
    const lookaheadDays = (opts && opts.lookaheadDays) || 120;
    const limit = (opts && opts.limit) || 4;

    const year = now.getFullYear();
    const pool = [...holidaysForYear(year), ...holidaysForYear(year + 1)];

    // Keep only events whose tail (longWeekend.end or date) is still in the future.
    const candidates = pool
      .map(h => decorate(h, now))
      .filter(h => h.daysToEnd >= 0 && h.daysToStart <= lookaheadDays)
      .sort((a, b) => a.daysToActive - b.daysToActive);

    return candidates.slice(0, limit).map(toModifier);
  }

  function decorate(h, now) {
    const isLong = !!h.longWeekend;
    const start = isLong ? startOfDay(h.longWeekend.start) : startOfDay(addDays(h.date, -2));
    const end   = isLong ? startOfDay(h.longWeekend.end)   : startOfDay(h.date);
    const spikeStart = addDays(start, -3); // prices typically firm 3 days before

    const daysToStart  = daysBetween(now, start);
    const daysToEnd    = daysBetween(now, end);
    const daysToActive = daysBetween(now, spikeStart);

    // Active when within the spike window OR during the long weekend itself.
    const active = now >= spikeStart && now <= end;

    return Object.assign({}, h, {
      isLong, start, end, spikeStart,
      daysToStart, daysToEnd, daysToActive, active
    });
  }

  function toModifier(h) {
    const dow = DOW[h.date.getDay()];
    let detail;

    if (h.isLong) {
      if (h.daysToStart <= 0 && h.daysToEnd >= 0) {
        detail = `Happening now · ${fmtRange(h.start, h.end)}`;
      } else if (h.daysToStart === 1) {
        detail = `Starts tomorrow · ${fmtRange(h.start, h.end)}`;
      } else if (h.daysToStart > 1) {
        detail = `In ${h.daysToStart} days · ${fmtRange(h.start, h.end)}`;
      } else {
        detail = `Wraps up ${fmtDate(h.end)}`;
      }
    } else {
      const dayLabel = `${fmtDate(h.date)} (${dow})`;
      if (h.daysToEnd === 0) {
        detail = `Today · ${dayLabel}`;
      } else if (h.daysToEnd === 1) {
        detail = `Tomorrow · ${dayLabel}`;
      } else if (h.daysToEnd > 1) {
        detail = `In ${h.daysToEnd} days · ${dayLabel}`;
      } else {
        detail = dayLabel;
      }
    }

    return {
      name: h.name,
      detail,
      icon: h.icon,
      impact: h.active ? h.impact : 0,
      active: h.active,
      // Bonus fields the renderer ignores today, useful for tooltips later:
      _date: h.date,
      _longWeekend: h.isLong ? { start: h.start, end: h.end } : null,
      _blurb: h.blurb
    };
  }

  return { upcoming, holidaysForYear, easterSunday };
})();
