# Wizard header and transition correction

Header text shares one center line. A fixed save-status slot prevents Saving/Saved from moving the progress tracks. The full-height wizard owns its form scrolling; the document scrollbar is hidden only while the wizard is open.

Screen changes use one 160ms opacity entrance. Nested staggered field entrances are suppressed without changing field wrapper layout. Heading focus happens before paint with preventScroll, replacing the delayed focus timer. Web artwork players are prepared between questions, paused while hidden, bounded to four cached scenes and disposed when leaving. The map starts after the screen entrance instead of competing with it.

The focused browser checks exercise all questions with normal motion on desktop and mobile, assert header/save-status geometry and stable heading positions, toggle reduced motion and record frame gaps/long tasks. Frame measurements are diagnostic rather than a machine-independent performance threshold. See after/measurements.json and after/draft-cleanup.json. The original baseline is in before/measurements.json.

The existing real-browser acceptance suite additionally covers publishing, copying, existing places, drafts, credit failures and safe retries. Its screenshots and results are under acceptance/. Test-created drafts and published data are cleaned up by the runners.
