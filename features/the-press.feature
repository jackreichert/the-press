Feature: The Press — Daily Word Puzzle

  Background:
    Given the game has loaded today's puzzle
    And the dictionary has finished loading

  # ─── Loading ──────────────────────────────────────────────────────────────────

  Feature: Game loading

    Scenario: Puzzle loads from schedule.json
      Given the app is opened fresh
      When schedule.json resolves successfully
      Then the player sees "Loading puzzle..." while the schedule is pending
      And the 2-3-2 letter grid appears once the puzzle is loaded
      And the center letter tile is visually distinct from surrounding tiles

    Scenario: Dictionary loads after puzzle
      Given the puzzle grid is visible
      When the dictionary is still loading
      Then the Enter button shows "(loading...)" and is disabled
      When the dictionary resolves
      Then the Enter button shows "Enter" and is enabled

    Scenario: Schedule fetch fails
      Given schedule.json returns a network error
      Then the player sees "Failed to load puzzle."
      And a "Retry" button is visible
      When the player taps "Retry"
      Then the page reloads

    Scenario: Puzzle index is derived from local calendar date
      Given today is day N since the epoch
      Then the puzzle shown uses puzzles[N] from schedule.json
      And the puzzle changes at local midnight, not UTC midnight

  # ─── Word input ───────────────────────────────────────────────────────────────

  Feature: Word input

    Scenario: Player builds a word by tapping tiles
      Given the puzzle has letters [A, B, C, D, E, F] surrounding center [G]
      When the player taps tiles "G", "A", "B"
      Then the word display shows "GAB"

    Scenario: Player builds a word using the physical keyboard
      Given the game is focused
      When the player presses keys "G", "A", "B"
      Then the word display shows "GAB"

    Scenario: Keyboard is active without tapping a tile first
      Given the puzzle grid has just appeared
      When the player immediately types a letter on the physical keyboard
      Then that letter appears in the word display

    Scenario: Keyboard works after clicking anywhere on the page
      Given the puzzle is loaded
      When the player clicks on the background margin (not a tile)
      And then types a letter
      Then that letter appears in the word display

    Scenario: Browser shortcuts are not intercepted
      Given the puzzle is active
      When the player presses Ctrl+R or Cmd+R
      Then the page reloads normally (modifier keys are not captured)

    Scenario: Backspace removes the last letter (keyboard)
      Given the word display shows "GAB"
      When the player presses Backspace
      Then the word display shows "GA"

    Scenario: Delete button removes the last letter
      Given the word display shows "GAB"
      When the player taps the "⌫" button
      Then the word display shows "GA"

    Scenario: Clear button empties the word
      Given the word display shows "GAB"
      When the player taps the "Clear" button
      Then the word display shows "—"

    Scenario: Non-letter keys are ignored
      Given the word display shows "GAB"
      When the player presses "1", "!", or "Space"
      Then the word display still shows "GAB"

    Scenario: Letter input is case-insensitive
      Given the player presses the "G" key (uppercase via Shift)
      Then the word display shows "G" (normalised to display uppercase, stored lowercase)

  # ─── Word submission ──────────────────────────────────────────────────────────

  Feature: Word submission

    Scenario: Enter key submits the word
      Given the word display shows "GRAB"
      When the player presses Enter
      Then the word is validated

    Scenario: Enter button submits the word
      Given the word display shows "GRAB"
      When the player taps the "Enter" button
      Then the word is validated

  # ─── Validation errors ────────────────────────────────────────────────────────

  Feature: Validation errors

    Scenario: Word is too short
      Given the word display shows "GA"
      When the player submits
      Then the error message "Too short" appears
      And the word display shakes
      And after 700ms the word display clears

    Scenario: Word is not in the dictionary
      Given the word display shows "GXYZ"
      When the player submits
      Then the error message "Not a word" appears
      And the word display shakes
      And after 700ms the word display clears

    Scenario: Word does not contain the center letter
      Given the center letter is "G"
      And the word display shows "BADE"
      When the player submits
      Then the error message "Missing center letter" appears
      And the word display shakes
      And after 700ms the word display clears

    Scenario: Word has already been found
      Given the player has already found "GRAB"
      And the word display shows "GRAB"
      When the player submits
      Then the error message "Already found" appears
      And the word display shakes
      And after 700ms the word display clears

    Scenario: Same error re-triggers shake
      Given the player submits an invalid word and sees the shake
      When the player submits the same invalid word again immediately
      Then the word display shakes again

  # ─── Valid words ──────────────────────────────────────────────────────────────

  Feature: Valid words

    Scenario: Valid word is accepted — brief found-word flash
      Given the word display shows a valid word
      When the player submits
      Then the found word briefly appears in the word display with an accent animation
      And a score label showing "+N pts" fades in below it
      And the word display clears to "—" after ~950ms
      And the word appears in the found-words list
      And the score increases

    Scenario: Pangram found — distinct animation
      Given the word display shows a valid pangram
      When the player submits
      Then the found word briefly appears in gold (pangram colour)
      And a "✦ Pangram +N pts" label appears

    Scenario: 4-letter word scores 1 point
      When the player finds a 4-letter word
      Then the score increases by 1

    Scenario: 5-letter word scores 5 points
      When the player finds a 5-letter word
      Then the score increases by 5

    Scenario: Pangram scores word-length plus 7 bonus points
      When the player finds a 7-letter pangram
      Then the score increases by 14 (7 + 7 bonus)

  # ─── Rank and progress ────────────────────────────────────────────────────────

  Feature: Rank and progress bar

    Scenario: Rank starts at Apprentice
      Given no words have been found
      Then the rank name shows "—" (before dictionary loads) then "Apprentice"

    Scenario: Rank advances as score percentage increases
      Given the player's score is 25% of max
      Then the rank shows "Pressman"

    Scenario: Progress bar reflects overall score percentage
      Given the player's score is 50% of max
      Then the progress bar fill is approximately 50%

    Scenario: Grand Colophon requires all words found
      Given the player has found all words
      Then the rank shows "Grand Colophon"

  # ─── Shuffle ─────────────────────────────────────────────────────────────────

  Feature: Shuffle

    Scenario: Shuffle rearranges surrounding letters
      Given the surrounding letters are in a known order
      When the player taps "Shuffle"
      Then the six surrounding letters are in a different order
      And the center letter remains in the center position

    Scenario: Shuffle triggers tile animation
      When the player taps "Shuffle"
      Then the six surrounding tiles briefly scale and rotate
      And the center tile is not animated

  # ─── Found words modal ────────────────────────────────────────────────────────

  Feature: Found words modal

    Scenario: Modal opens when player taps score area
      Given the player has found some words
      When the player taps "Score: N · N words ▾"
      Then the found-words modal opens
      And the found words are listed in alphabetical order in two columns

    Scenario: Pangrams are visually distinct in the modal
      Given the player has found a pangram
      When the player opens the found-words modal
      Then the pangram has the CSS class "pangram-word"

    Scenario: Modal closes on ✕ button
      Given the found-words modal is open
      When the player taps the "✕" button
      Then the modal closes

    Scenario: Modal closes on overlay tap
      Given the found-words modal is open
      When the player taps outside the modal card
      Then the modal closes

  # ─── Game over ────────────────────────────────────────────────────────────────

  Feature: Game over

    Scenario: Game-over screen replaces grid when all words are found
      Given the player finds the last remaining word
      Then the letter grid and action row disappear
      And the game-over screen appears showing rank, score, word count, and pangram count

    Scenario: Game-over screen format
      Given the player finished with rank "Publisher", score 120, 48/96 words, 2 pangrams
      Then the game-over screen shows "Publisher"
      And "Score: 120 | 48/96 words | 2 pangrams"

  # ─── Share button ─────────────────────────────────────────────────────────────

  Feature: Share button

    Scenario: Share button appears only on game-over screen
      Given the game is in progress
      Then no share button is visible
      When the player finds all words
      Then the "Share Result" button appears

    Scenario: Successful clipboard copy
      Given the game-over screen is showing
      When the player taps "Share Result"
      And the clipboard API succeeds
      Then the button text changes to "Copied!"
      And after 2 seconds the button reverts to "Share Result"

    Scenario: Share text format — newspaper style
      Given the player finished on 2026-05-15 as "Publisher" with score 120, 48/96 words, 2 pangrams
      When the player copies the share text
      Then the clipboard contains:
        """
        The Press · May 15, 2026
        ━━━━━━━━━━━━━━━━━━━━━
          PUBLISHER
          ▓▓▓▓▓▓▓▓▓▓ 120 pts
          48/96 words  ✦ 2 pangrams
        ━━━━━━━━━━━━━━━━━━━━━
          thepress.app
        """

    Scenario: Mobile share — native share sheet
      Given the player is on a mobile device with navigator.share available
      When the player taps "Share Result"
      Then the native OS share sheet opens with the share text

    Scenario: Clipboard API unavailable — textarea fallback
      Given the clipboard API is blocked or unavailable
      When the player taps "Share Result"
      Then a read-only textarea appears pre-filled with the share text

  # ─── Carry-over puzzle ────────────────────────────────────────────────────────

  Feature: Carry-over unfinished puzzle

    Scenario: New day loads previous unfinished puzzle first
      Given the player started yesterday's puzzle and found some words
      When the player opens the game today (a new day)
      Then yesterday's puzzle is loaded with the player's progress restored
      And a "Reveal answers · play today's puzzle →" link is visible below the grid

    Scenario: Player finishes carry-over puzzle naturally
      Given the player is finishing yesterday's puzzle
      When the player finds all remaining words
      Then the game-over screen appears for yesterday's puzzle
      And a "Play today's puzzle →" button appears instead of the Share button

    Scenario: Player reveals answers for carry-over puzzle
      Given the player is on yesterday's unfinished puzzle
      When the player taps "Reveal answers · play today's puzzle →"
      Then all puzzle words are shown — found words highlighted, missed words greyed
      And a "Play today's puzzle →" button appears

    Scenario: Revealed words distinguish found from missed
      Given the player revealed answers after finding some words
      Then found words have an accent-coloured style
      And words the player missed are greyed out
      And pangrams that were found are shown in gold

    Scenario: Play Today button loads today's puzzle
      Given the carry-over game-over screen is showing
      When the player taps "Play today's puzzle →"
      Then today's puzzle loads fresh with score 0 and no found words

    Scenario: Page reload during carry-over resumes the carry-over
      Given the player is mid-carry-over (yesterday's puzzle in progress)
      When the player reloads the page
      Then yesterday's puzzle and progress are restored
      And the Play Today option is still available

  # ─── Persistence ─────────────────────────────────────────────────────────────

  Feature: State persistence

    Scenario: Found words survive a page reload
      Given the player has found 3 words and scored 10 points
      When the player reloads the page
      Then the same 3 words are shown as found
      And the score shows 10

    Scenario: New day — previous unfinished puzzle is carried over
      Given the player found some words yesterday but did not finish
      When the player opens the game today (a new day)
      Then yesterday's puzzle is loaded (not today's)
      And the player can continue or reveal and move on

    Scenario: Previous partial day is saved to history when carried over
      Given the player completed or revealed the carry-over puzzle
      Then yesterday's partial result is saved to history with completed: false (if revealed)
      Or with completed: true (if the player found all words)

    Scenario: Safari private mode — game still works
      Given localStorage is unavailable (Safari private mode)
      When the player plays the game
      Then the game works normally for the session
      And no JavaScript errors are thrown

  # ─── Stats modal ─────────────────────────────────────────────────────────────

  Feature: Stats modal

    Scenario: Stats modal opens from streak counter
      Given the streak counter shows "🔥 N"
      When the player taps the streak counter
      Then the stats modal opens
      And it shows "Your Stats"
      And it shows streak, games played, and average score

    Scenario: Stats modal closes on ✕ or overlay tap
      Given the stats modal is open
      When the player taps "✕" or outside the modal card
      Then the stats modal closes

    Scenario: Streak shows 0 for a new player
      Given no history exists
      Then the streak counter shows "🔥 0"
      And the stats modal shows "0 days"

    Scenario: Streak increments when any word is found today
      Given the player found at least one word today
      Then the streak is at least 1

    Scenario: Streak resets after a missed day
      Given the player has a 5-day streak
      When the player skips a day
      Then the streak resets to 0

  # ─── PWA / installability ────────────────────────────────────────────────────

  Feature: Installable PWA

    Scenario: App is installable on Android Chrome
      Given the player visits thepress.app in Chrome on Android
      Then Chrome shows an "Add to Home Screen" prompt
      When the player installs it
      Then the app opens in standalone mode with no browser chrome

    Scenario: App is installable on iOS Safari
      Given the player visits thepress.app in Safari on iOS
      When the player taps Share → "Add to Home Screen"
      Then the app installs with the UnifrakturMaguntia "P" letterpress icon

    Scenario: Game works offline after first visit
      Given the player has visited thepress.app at least once
      When the device has no network connection
      Then the game loads and plays normally using the service worker cache

    Scenario: Puzzle data is always fresh
      Given the player opens the app with a network connection
      Then schedule.json and dictionary.json are fetched from the network first
      And only fall back to cache if the network request fails within 5 seconds

  # ─── Scoring unit behaviours ─────────────────────────────────────────────────

  Feature: Scoring utilities

    Scenario Outline: Word scoring formula
      Given a <length>-letter word that is <pangram>
      Then the score is <points>

      Examples:
        | length | pangram | points |
        | 4      | no      | 1      |
        | 5      | no      | 5      |
        | 6      | no      | 6      |
        | 7      | no      | 7      |
        | 7      | yes     | 14     |
        | 5      | yes     | 12     |

  Feature: Streak computation

    Scenario Outline: Streak algorithm edge cases
      Given history entries <entries>
      And today is <today>
      Then computeStats returns streak <streak>

      Examples:
        | entries                         | today        | streak |
        | []                              | 2026-05-15   | 0      |
        | [2026-05-15]                    | 2026-05-15   | 1      |
        | [2026-05-14]                    | 2026-05-15   | 1      |
        | [2026-05-14, 2026-05-15]        | 2026-05-15   | 2      |
        | [2026-05-13, 2026-05-15]        | 2026-05-15   | 1      |
        | [2026-05-13]                    | 2026-05-15   | 0      |
        | [2026-05-16]                    | 2026-05-15   | 0      |
