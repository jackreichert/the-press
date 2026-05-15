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

    Scenario: Valid word is accepted
      Given the word display shows a valid word
      When the player submits
      Then the word appears in the found-words list
      And the score increases
      And the word display clears

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

  # ─── Found words modal ────────────────────────────────────────────────────────

  Feature: Found words modal

    Scenario: Modal opens when player taps score area
      Given the player has found some words
      When the player taps "Score: N · N/N words ▾"
      Then the found-words modal opens
      And the found words are listed in alphabetical order

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
      Given the player finished with rank "Publisher", score 120, 48 words, 2 pangrams
      Then the game-over screen shows "Publisher"
      And "Score: 120 | 48 words | 2 pangrams"

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

    Scenario: Share text is spoiler-free
      Given the player finished on 2026-05-15 as "Publisher" with score 120, 48/96 words, 2 pangrams
      When the player copies the share text
      Then the clipboard contains:
        """
        The Press — 2026-05-15
        Publisher — Score: 120 | 48/96 words | 2 pangrams
        """

    Scenario: Clipboard API unavailable — textarea fallback
      Given the clipboard API is blocked or unavailable
      When the player taps "Share Result"
      Then a read-only textarea appears pre-filled with the share text

  # ─── Persistence ─────────────────────────────────────────────────────────────

  Feature: State persistence

    Scenario: Found words survive a page reload
      Given the player has found 3 words and scored 10 points
      When the player reloads the page
      Then the same 3 words are shown as found
      And the score shows 10

    Scenario: In-progress state is not restored for a different day
      Given the player played yesterday and stored some found words
      When the player opens the game today (a new day)
      Then yesterday's found words are not restored
      And the puzzle shows today's puzzle with no found words

    Scenario: Previous partial day is saved to history on new-day load
      Given the player found 2 words yesterday but did not finish
      When the player opens the game today
      Then yesterday's partial result is saved to history (completed: false)

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
