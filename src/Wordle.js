import React, { useState, useEffect, useCallback } from 'react';

const Wordle = () => {
  const [targetWord, setTargetWord] = useState('');
  const [wordMeaning, setWordMeaning] = useState(null);
  const [customWord, setCustomWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('loading'); // 'loading', 'playing', 'won', 'lost'
  const [shake, setShake] = useState(false);
  const [usedLetters, setUsedLetters] = useState({});
  const [error, setError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [isPlayingTodayWord, setIsPlayingTodayWord] = useState(true);
  const [todayWordCompleted, setTodayWordCompleted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [todayGameData, setTodayGameData] = useState(null);
  const [showDailyStats, setShowDailyStats] = useState(false);
  const [dailyWordStats, setDailyWordStats] = useState({
    attempt1: 0,
    attempt2: 0,
    attempt3: 0,
    attempt4: 0,
    attempt5: 0,
    attempt6: 0,
    totalWins: 0
  });

  const maxGuesses = 6;
  const wordLength = 5;

  // Cookie management functions
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // Daily Word Stats Management
  const loadDailyWordStats = () => {
    const statsData = getCookie('wordleDailyWordStats');
    if (statsData) {
      try {
        const stats = JSON.parse(decodeURIComponent(statsData));
        setDailyWordStats(stats);
        return stats;
      } catch (error) {
        console.error('Error parsing daily word stats:', error);
        const defaultStats = {
          attempt1: 0,
          attempt2: 0,
          attempt3: 0,
          attempt4: 0,
          attempt5: 0,
          attempt6: 0,
          totalWins: 0
        };
        setDailyWordStats(defaultStats);
        return defaultStats;
      }
    }
    return {
      attempt1: 0,
      attempt2: 0,
      attempt3: 0,
      attempt4: 0,
      attempt5: 0,
      attempt6: 0,
      totalWins: 0
    };
  };

  const updateDailyWordStats = (attemptsUsed) => {
    const currentStats = loadDailyWordStats();
    const attemptKey = `attempt${attemptsUsed}`;

    const updatedStats = {
      ...currentStats,
      [attemptKey]: (currentStats[attemptKey] || 0) + 1,
      totalWins: (currentStats.totalWins || 0) + 1
    };

    setCookie('wordleDailyWordStats', encodeURIComponent(JSON.stringify(updatedStats)), 365);
    setDailyWordStats(updatedStats);
  };

  // Load dark mode preference
  useEffect(() => {
    const savedTheme = getCookie('wordleTheme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    setCookie('wordleTheme', newMode ? 'dark' : 'light', 365);
  };

  const isTodayWordCompleted = () => {
    const todaySession = getTodayGameSession();
    return todaySession && (todaySession.gameStatus === 'won' || todaySession.gameStatus === 'lost');
  };

  const handleShowTodayResult = async () => {
    const todaySession = getTodayGameSession();
    if (todaySession && (todaySession.gameStatus === 'won' || todaySession.gameStatus === 'lost')) {
      // Fetch meaning if not already loaded
      const meaning = await fetchWordMeaning(todaySession.targetWord);

      setTodayGameData({
        targetWord: todaySession.targetWord,
        guesses: todaySession.guesses,
        gameStatus: todaySession.gameStatus,
        meaning: meaning
      });
      setShowTodayModal(true);
    }
  };

  const getTodayDateString = () => {
    // Get current date in Asia/Kolkata timezone
    const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const kolkataDate = new Date(today);
    const year = kolkataDate.getFullYear();
    const month = String(kolkataDate.getMonth() + 1).padStart(2, '0');
    const day = String(kolkataDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD format in IST
  };

  const getYesterdayDateString = () => {
    // Get yesterday's date in Asia/Kolkata timezone
    const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const kolkataDate = new Date(today);
    kolkataDate.setDate(kolkataDate.getDate() - 1);
    const year = kolkataDate.getFullYear();
    const month = String(kolkataDate.getMonth() + 1).padStart(2, '0');
    const day = String(kolkataDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD format in IST
  };

  // Today's game session management
  const getTodayGameSession = () => {
    const sessionData = getCookie('wordleTodaySession');
    if (sessionData) {
      try {
        const data = JSON.parse(decodeURIComponent(sessionData));
        const today = getTodayDateString();

        // Check if session is for today (in IST timezone)
        if (data.date === today) {
          return data;
        } else {
          // Old session (from before today's IST midnight), clear it
          deleteCookie('wordleTodaySession');
          return null;
        }
      } catch (error) {
        console.error('Error parsing today session:', error);
        return null;
      }
    }
    return null;
  };

  const saveTodayGameSession = (sessionData) => {
    setCookie('wordleTodaySession', encodeURIComponent(JSON.stringify(sessionData)), 1);
  };

  const clearTodayGameSession = () => {
    deleteCookie('wordleTodaySession');
  };

  // Streak management functions
  const loadStreakData = () => {
    const streakData = getCookie('wordleStreak');
    if (streakData) {
      try {
        const data = JSON.parse(decodeURIComponent(streakData));
        setCurrentStreak(data.currentStreak || 0);
        setMaxStreak(data.maxStreak || 0);
        return data;
      } catch (error) {
        console.error('Error parsing streak data:', error);
        setCurrentStreak(0);
        setMaxStreak(0);
        return { currentStreak: 0, maxStreak: 0, lastWonDate: '' };
      }
    }
    return { currentStreak: 0, maxStreak: 0, lastWonDate: '' };
  };

  const updateStreak = (won) => {
    const today = getTodayDateString();
    const streakData = loadStreakData();
    const lastWonDate = streakData.lastWonDate;
    const yesterday = getYesterdayDateString();

    let newCurrentStreak = streakData.currentStreak;
    let newMaxStreak = streakData.maxStreak;

    if (won) {
      // Check if already won today
      if (lastWonDate === today) {
        // Already won today, don't update streak
        return;
      }

      // Check if won yesterday (consecutive day)
      if (lastWonDate === yesterday) {
        newCurrentStreak += 1;
      } else if (lastWonDate === '') {
        // First time winning
        newCurrentStreak = 1;
      } else {
        // Streak broken, start new streak
        newCurrentStreak = 1;
      }

      // Update max streak if current exceeds it
      if (newCurrentStreak > newMaxStreak) {
        newMaxStreak = newCurrentStreak;
      }

      // Save updated streak data
      const updatedStreakData = {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        lastWonDate: today
      };

      setCookie('wordleStreak', encodeURIComponent(JSON.stringify(updatedStreakData)), 365);
      setCurrentStreak(newCurrentStreak);
      setMaxStreak(newMaxStreak);
    } else {
      // Lost the game
      // Only reset streak if we haven't already lost today
      if (lastWonDate !== today) {
        // Check if we had a streak from yesterday
        if (lastWonDate === yesterday || lastWonDate === '') {
          // Reset current streak but keep max streak
          const updatedStreakData = {
            currentStreak: 0,
            maxStreak: newMaxStreak,
            lastWonDate: lastWonDate
          };

          setCookie('wordleStreak', encodeURIComponent(JSON.stringify(updatedStreakData)), 365);
          setCurrentStreak(0);
        }
      }
    }
  };

  const loadGameHistory = () => {
    const historyData = getCookie('wordleHistory');
    const historyDate = getCookie('wordleHistoryDate');
    const today = getTodayDateString();

    if (historyDate !== today) {
      // Clear old history if date is different (based on IST timezone)
      deleteCookie('wordleHistory');
      deleteCookie('wordleHistoryDate');
      setGameHistory([]);
      return [];
    }

    if (historyData) {
      try {
        const history = JSON.parse(decodeURIComponent(historyData));
        setGameHistory(history);
        return history;
      } catch (error) {
        console.error('Error parsing game history:', error);
        setGameHistory([]);
        return [];
      }
    }

    return [];
  };

  const saveGameResult = (result) => {
    const today = getTodayDateString();
    const currentHistory = loadGameHistory();
    const newHistory = [...currentHistory, result];

    setGameHistory(newHistory);
    setCookie('wordleHistory', encodeURIComponent(JSON.stringify(newHistory)));
    setCookie('wordleHistoryDate', today);

    // Update streak based on result only if playing today's word
    if (isPlayingTodayWord) {
      updateStreak(result.won);

      // Update daily word stats if won
      if (result.won) {
        updateDailyWordStats(result.guesses);
      }
    }
  };

  const getGameStats = (history) => {
    const totalGames = history.length;
    const wins = history.filter(game => game.won).length;
    const losses = totalGames - wins;
    const winPercentage = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    const guessDistribution = [0, 0, 0, 0, 0, 0]; // Index 0 = 1 guess, Index 5 = 6 guesses
    history.forEach(game => {
      if (game.won && game.guesses <= 6) {
        guessDistribution[game.guesses - 1]++;
      }
    });

    return {
      totalGames,
      wins,
      losses,
      winPercentage,
      guessDistribution
    };
  };

  const fetchWordMeaning = async (word) => {
    try {
      const response = await fetch(`https://wordlegame-0n81.onrender.com/word-meaning/${word.toLowerCase()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching word meaning:', err);
      return null;
    }
  };

  const pronounceWord = (word) => {
    // Try using an audio API first for better pronunciation
    const audioUrl = `https://api.dictionaryapi.dev/media/pronunciations/en/${word.toLowerCase()}-us.mp3`;
    const audio = new Audio(audioUrl);

    audio.play().catch(() => {
      // If audio fails, fall back to speech synthesis
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
        utterance.rate = 0.7; // Slower for clarity
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to use a high-quality English voice
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(voice =>
          voice.lang === 'en-US' || voice.lang === 'en-GB' || voice.lang.startsWith('en')
        );
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        window.speechSynthesis.speak(utterance);
      } else {
        alert('Audio pronunciation is not available');
      }
    });
  };

  const validateWord = async (word) => {
    try {
      const meaning = await fetchWordMeaning(word);
      return meaning !== null && meaning.meanings && meaning.meanings.length > 0;
    } catch (err) {
      console.error('Error validating word:', err);
      return false;
    }
  };

  const restoreTodaySession = async (session) => {
    console.log('Restoring session:', session);
    setTargetWord(session.targetWord);
    setGuesses(session.guesses);
    setUsedLetters(session.usedLetters);
    setGameStatus(session.gameStatus);
    setIsPlayingTodayWord(true);
    setTodayWordCompleted(session.gameStatus === 'won' || session.gameStatus === 'lost');
    setCurrentGuess(''); // Clear any current guess

    // Fetch meaning for the word
    const meaning = await fetchWordMeaning(session.targetWord);
    setWordMeaning(meaning);

    // Save today's game data for modal display (if game is completed)
    if (session.gameStatus === 'won' || session.gameStatus === 'lost') {
      setTodayGameData({
        targetWord: session.targetWord,
        guesses: session.guesses,
        gameStatus: session.gameStatus,
        meaning: meaning
      });
    }
  };

  const fetchTodaysWord = async () => {
    try {
      setGameStatus('loading');
      setError('');

      // Check if today's game session exists (based on IST timezone)
      const todaySession = getTodayGameSession();
      if (todaySession) {
        console.log('Restoring today\'s session:', todaySession);
        await restoreTodaySession(todaySession);
        return;
      }

      const url = 'https://wordlegame-0n81.onrender.com/wordle-word';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.solution && typeof data.solution === 'string') {
        const solution = data.solution.toUpperCase();
        console.log('Setting target word:', solution);
        setTargetWord(solution);

        // Fetch meaning for the word
        const meaning = await fetchWordMeaning(solution);
        setWordMeaning(meaning);

        setGameStatus('playing');
        setIsPlayingTodayWord(true);
        setTodayWordCompleted(false);
        resetGame();
      } else {
        console.error('Invalid API response:', data);
        throw new Error(data.error || 'No solution found in API response');
      }
    } catch (err) {
      console.error('Error fetching today\'s word:', err);
      setError(`Could not fetch today's word: ${err.message}`);
      setTargetWord('REACT');

      // Fetch meaning for fallback word
      const meaning = await fetchWordMeaning('REACT');
      setWordMeaning(meaning || {
        word: 'REACT',
        phonetic: '/riˈækt/',
        meanings: [
          {
            partOfSpeech: 'verb',
            definition: 'respond or behave in a particular way in response to something'
          }
        ]
      });

      setGameStatus('playing');
      setIsPlayingTodayWord(true);
      setTodayWordCompleted(false);
      resetGame();
    }
  };

  const fetchNewWord = async () => {
    try {
      setGameStatus('loading');
      setError('');
      const url = 'https://wordlegame-0n81.onrender.com/wordle-word?today=false';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('New Word API Response:', data);

      if (data.solution && typeof data.solution === 'string') {
        const solution = data.solution.toUpperCase();
        console.log('Setting new target word:', solution);
        setTargetWord(solution);

        // Fetch meaning for the word
        const meaning = await fetchWordMeaning(solution);
        setWordMeaning(meaning);

        setGameStatus('playing');
        setIsPlayingTodayWord(false); // Mark as practice word
        setTodayWordCompleted(false);
        resetGame();
      } else {
        console.error('Invalid API response:', data);
        throw new Error(data.error || 'No solution found in API response');
      }
    } catch (err) {
      console.error('Error fetching new word:', err);
      setError(`Could not fetch new word: ${err.message}`);
      // Fall back to a random word from a small list
      const fallbackWords = ['BEACH', 'CRANE', 'FLAME', 'GRAPE', 'HOUSE'];
      const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
      setTargetWord(randomWord);

      // Fetch meaning for fallback word
      const meaning = await fetchWordMeaning(randomWord);
      setWordMeaning(meaning);

      setGameStatus('playing');
      setIsPlayingTodayWord(false); // Mark as practice word
      setTodayWordCompleted(false);
      resetGame();
    }
  };

  // Load game history, streak, and daily word stats on component mount
  useEffect(() => {
    loadGameHistory();
    loadStreakData();
    loadDailyWordStats();
    fetchTodaysWord();
  }, []);

  const resetGame = useCallback(() => {
    setGuesses([]);
    setCurrentGuess('');
    setUsedLetters({});
    setValidationMessage('');
    if (gameStatus !== 'loading') {
      setGameStatus('playing');
    }
  }, [gameStatus]);

  const setNewWord = async () => {
    if (customWord.length === wordLength && /^[A-Za-z]+$/.test(customWord)) {
      setTargetWord(customWord.toUpperCase());

      // Fetch meaning for custom word
      const meaning = await fetchWordMeaning(customWord);
      setWordMeaning(meaning);

      setCustomWord('');
      setIsPlayingTodayWord(false); // Custom word is practice
      setTodayWordCompleted(false);
      resetGame();
    }
  };

  const checkGuess = (guess) => {
    const result = [];
    const targetLetters = targetWord.split('');
    const guessLetters = guess.split('');
    const letterCount = {};

    // Count letters in target word
    targetLetters.forEach(letter => {
      letterCount[letter] = (letterCount[letter] || 0) + 1;
    });

    // First pass: mark correct positions
    guessLetters.forEach((letter, index) => {
      if (letter === targetLetters[index]) {
        result[index] = 'correct';
        letterCount[letter]--;
      }
    });

    // Second pass: mark present/absent
    guessLetters.forEach((letter, index) => {
      if (result[index] === undefined) {
        if (letterCount[letter] > 0) {
          result[index] = 'present';
          letterCount[letter]--;
        } else {
          result[index] = 'absent';
        }
      }
    });

    return result;
  };

  const updateUsedLetters = (guess, result) => {
    const newUsedLetters = { ...usedLetters };
    guess.split('').forEach((letter, index) => {
      const status = result[index];
      if (!newUsedLetters[letter] ||
          (newUsedLetters[letter] === 'absent' && status !== 'absent') ||
          (newUsedLetters[letter] === 'present' && status === 'correct')) {
        newUsedLetters[letter] = status;
      }
    });
    setUsedLetters(newUsedLetters);
    return newUsedLetters;
  };

  const submitGuess = async () => {
    if (currentGuess.length !== wordLength) {
      setShake(true);
      setValidationMessage('Word must be 5 letters long');
      setTimeout(() => {
        setShake(false);
        setValidationMessage('');
      }, 2000);
      return;
    }

    // Check if the guess is the target word (always allow)
    if (currentGuess === targetWord) {
      const result = checkGuess(currentGuess);
      const newGuess = { word: currentGuess, result };
      const newGuesses = [...guesses, newGuess];
      const newUsedLetters = updateUsedLetters(currentGuess, result);

      setGuesses(newGuesses);
      setGameStatus('won');
      setCurrentGuess('');

      // Save game result
      const gameResult = {
        word: targetWord,
        won: true,
        guesses: newGuesses.length,
        date: new Date().toISOString(),
        timestamp: Date.now()
      };
      saveGameResult(gameResult);

      // Save today's session only if playing today's word
      if (isPlayingTodayWord) {
        const sessionData = {
          date: getTodayDateString(),
          targetWord: targetWord,
          guesses: newGuesses,
          usedLetters: newUsedLetters,
          gameStatus: 'won'
        };
        saveTodayGameSession(sessionData);
        setTodayWordCompleted(true);

        // Save today's game data for modal display
        setTodayGameData({
          targetWord: targetWord,
          guesses: newGuesses,
          gameStatus: 'won',
          meaning: wordMeaning
        });
      }
      return;
    }

    // Validate the word by checking if it has a meaning
    setIsValidating(true);
    setValidationMessage('Checking word...');

    const isValid = await validateWord(currentGuess);

    setIsValidating(false);

    if (!isValid) {
      setShake(true);
      setValidationMessage('Sorry, does not look to be a valid English word');
      setTimeout(() => {
        setShake(false);
        setValidationMessage('');
      }, 3000);
      return;
    }

    // Word is valid, proceed with the guess
    setValidationMessage('');
    const result = checkGuess(currentGuess);
    const newGuess = { word: currentGuess, result };
    const newGuesses = [...guesses, newGuess];
    const newUsedLetters = updateUsedLetters(currentGuess, result);

    setGuesses(newGuesses);

    if (currentGuess === targetWord) {
      setGameStatus('won');
      // Save game result
      const gameResult = {
        word: targetWord,
        won: true,
        guesses: newGuesses.length,
        date: new Date().toISOString(),
        timestamp: Date.now()
      };
      saveGameResult(gameResult);

      // Save today's session only if playing today's word
      if (isPlayingTodayWord) {
        const sessionData = {
          date: getTodayDateString(),
          targetWord: targetWord,
          guesses: newGuesses,
          usedLetters: newUsedLetters,
          gameStatus: 'won'
        };
        saveTodayGameSession(sessionData);
        setTodayWordCompleted(true);

        // Save today's game data for modal display
        setTodayGameData({
          targetWord: targetWord,
          guesses: newGuesses,
          gameStatus: 'won',
          meaning: wordMeaning
        });
      }
    } else if (newGuesses.length >= maxGuesses) {
      setGameStatus('lost');
      // Save game result
      const gameResult = {
        word: targetWord,
        won: false,
        guesses: newGuesses.length,
        date: new Date().toISOString(),
        timestamp: Date.now()
      };
      saveGameResult(gameResult);

      // Save today's session only if playing today's word
      if (isPlayingTodayWord) {
        const sessionData = {
          date: getTodayDateString(),
          targetWord: targetWord,
          guesses: newGuesses,
          usedLetters: newUsedLetters,
          gameStatus: 'lost'
        };
        saveTodayGameSession(sessionData);
        setTodayWordCompleted(true);

        // Save today's game data for modal display
        setTodayGameData({
          targetWord: targetWord,
          guesses: newGuesses,
          gameStatus: 'lost',
          meaning: wordMeaning
        });
      }
    } else {
      // Game still in progress - save session if playing today's word
      if (isPlayingTodayWord) {
        const sessionData = {
          date: getTodayDateString(),
          targetWord: targetWord,
          guesses: newGuesses,
          usedLetters: newUsedLetters,
          gameStatus: 'playing'
        };
        saveTodayGameSession(sessionData);
      }
    }

    setCurrentGuess('');
  };

  const handleKeyPress = useCallback((e) => {
    if (gameStatus !== 'playing' || isValidating) return;

    if (e.key === 'Enter') {
      submitGuess();
    } else if (e.key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
      setValidationMessage(''); // Clear validation message when user starts typing
    } else if (/^[A-Za-z]$/.test(e.key) && currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + e.key.toUpperCase());
      setValidationMessage(''); // Clear validation message when user starts typing
    }
  }, [currentGuess, gameStatus, targetWord, guesses, usedLetters, isValidating]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const getCellStyle = (status, hasLetter = false) => {
    const baseStyle = "w-12 h-12 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-lg sm:text-2xl font-bold transition-all duration-300";
    switch (status) {
      case 'correct':
        return `${baseStyle} bg-green-500 border-green-500 text-white`;
      case 'present':
        return `${baseStyle} bg-yellow-500 border-yellow-500 text-white`;
      case 'absent':
        return `${baseStyle} ${darkMode ? 'bg-gray-700 border-gray-700' : 'bg-gray-500 border-gray-500'} text-white`;
      default:
        return `${baseStyle} ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300'} ${hasLetter ? (darkMode ? 'text-white border-gray-400' : 'text-black border-gray-500') : (darkMode ? 'text-white' : 'text-black')}`;
    }
  };

  const getKeyStyle = (letter) => {
    const baseStyle = "px-2 sm:px-3 py-3 sm:py-4 m-0.5 sm:m-1 rounded font-bold cursor-pointer transition-all duration-200 hover:opacity-80 text-sm sm:text-base";
    const status = usedLetters[letter];
    switch (status) {
      case 'correct':
        return `${baseStyle} bg-green-500 text-white`;
      case 'present':
        return `${baseStyle} bg-yellow-500 text-white`;
      case 'absent':
        return `${baseStyle} ${darkMode ? 'bg-gray-900 text-gray-500' : 'bg-gray-500 text-white'}`;
      default:
        return `${baseStyle} ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'}`;
    }
  };

  const handleKeyClick = (key) => {
    if (gameStatus !== 'playing' || isValidating) return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === '⌫') {
      setCurrentGuess(prev => prev.slice(0, -1));
      setValidationMessage(''); // Clear validation message when user starts typing
    } else if (currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + key);
      setValidationMessage(''); // Clear validation message when user starts typing
    }
  };

  const keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];

  const stats = getGameStats(gameHistory);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col items-center justify-center p-2 sm:p-4 transition-colors duration-300`}>
      <div className="max-w-md w-full px-2 sm:px-0">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h1 className={`text-3xl sm:text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Wordle</h1>
          <div className="flex gap-2">
            <button
              onClick={handleShowTodayResult}
              disabled={!isTodayWordCompleted()}
              className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                isTodayWordCompleted()
                  ? 'bg-purple-500 text-white hover:bg-purple-600 cursor-pointer'
                  : darkMode
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={isTodayWordCompleted() ? "View Today's Result" : "Complete today's word first"}
            >
              📋 Today
            </button>
            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded hover:opacity-80 text-sm font-semibold transition-all ${
                darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-800'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setShowDailyStats(!showDailyStats)}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-semibold"
              title="Daily Word Lifetime Stats"
            >
              🏅 Daily
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-semibold"
            >
              📊 Stats
            </button>
          </div>
        </div>

        {/* Streak Display - Always visible */}
        <div className={`mb-4 p-3 rounded-lg shadow-sm ${
          darkMode
            ? 'bg-gradient-to-r from-orange-900 to-yellow-900 border-2 border-orange-600'
            : 'bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300'
        }`}>
          <div className="flex justify-around items-center">
            <div className="text-center">
              <div className={`text-3xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                🔥 {currentStreak}
              </div>
              <div className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Current Streak
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${darkMode ? 'text-orange-300' : 'text-orange-500'}`}>
                🏆 {maxStreak}
              </div>
              <div className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Best Streak
              </div>
            </div>
          </div>
          <div className={`mt-2 text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {isTodayWordCompleted() ?
              "You've completed today's word! Come back tomorrow." :
              isPlayingTodayWord ?
              "Win today's word to keep your streak alive!" :
              "Practice mode - doesn't affect your streak"
            }
          </div>
        </div>

        {/* Today's Game Completed Notice - Only show when today's word is completed */}
        {isPlayingTodayWord && isTodayWordCompleted() && gameStatus !== 'playing' && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            darkMode
              ? 'bg-blue-900 border-2 border-blue-600'
              : 'bg-blue-50 border-2 border-blue-300'
          }`}>
            <div className={`text-sm font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              📅 This was today's word
            </div>
            <div className={`text-xs mt-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Come back tomorrow for a new word, or click "New Word" to practice!
            </div>
          </div>
        )}

        {/* Practice Mode Notice - Show when playing practice word after completing today's word */}
        {!isPlayingTodayWord && isTodayWordCompleted() && gameStatus === 'playing' && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            darkMode
              ? 'bg-green-900 border-2 border-green-600'
              : 'bg-green-50 border-2 border-green-300'
          }`}>
            <div className={`text-sm font-semibold ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
              🎮 Practice Mode
            </div>
            <div className={`text-xs mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              This game won't affect your streak. Click "📋 Today" to see your daily result!
            </div>
          </div>
        )}

        {/* Daily Word Lifetime Statistics Panel */}
        {showDailyStats && (
          <div className={`mb-6 p-4 rounded-lg shadow-sm ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🏅 Daily Word Lifetime Stats
            </h2>
            <div className={`text-center mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Track your performance across all daily words
            </div>

            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div className="col-span-2">
                <div className="text-3xl font-bold text-green-600">{dailyWordStats.totalWins}</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Daily Wins</div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                Wins by Attempt
              </h3>
              {[1, 2, 3, 4, 5, 6].map((attemptNum) => {
                const count = dailyWordStats[`attempt${attemptNum}`] || 0;
                const percentage = dailyWordStats.totalWins > 0
                  ? (count / dailyWordStats.totalWins) * 100
                  : 0;

                return (
                  <div key={attemptNum} className="flex items-center mb-2">
                    <span className={`text-sm w-12 font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {attemptNum} {attemptNum === 1 ? 'try' : 'tries'}
                    </span>
                    <div className={`flex-1 mx-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-8 relative overflow-hidden`}>
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-end px-2 transition-all duration-500 ease-out rounded"
                        style={{
                          width: `${Math.max(percentage, count > 0 ? 15 : 0)}%`,
                        }}
                      >
                        {count > 0 && (
                          <span className="text-white text-sm font-bold">
                            {count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs w-12 text-right ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {percentage > 0 ? percentage.toFixed(0) : 0}%
                    </span>
                  </div>
                );
              })}
            </div>

            {dailyWordStats.totalWins > 0 && (
              <div className={`mt-4 p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-center`}>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Average Attempts: <span className="font-bold text-blue-600">
                    {(
                      ([1,2,3,4,5,6].reduce((sum, num) =>
                        sum + (num * (dailyWordStats[`attempt${num}`] || 0)), 0
                      )) / dailyWordStats.totalWins
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {dailyWordStats.totalWins === 0 && (
              <div className={`text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'} italic`}>
                Complete daily words to see your stats here!
              </div>
            )}
          </div>
        )}

        {/* Statistics Panel */}
        {showStats && (
          <div className={`mb-6 p-4 rounded-lg shadow-sm ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Today's Statistics
            </h2>
            <div className="grid grid-cols-4 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.totalGames}</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Games</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Wins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.losses}</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Losses</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{stats.winPercentage}%</div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Win Rate</div>
              </div>
            </div>

            {stats.totalGames > 0 && (
              <>
                <div className="mb-4">
                  <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    Guess Distribution
                  </h3>
                  {stats.guessDistribution.map((count, index) => (
                    <div key={index} className="flex items-center mb-1">
                      <span className={`text-xs w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {index + 1}
                      </span>
                      <div className={`flex-1 mx-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className="bg-green-500 text-white text-xs text-center rounded px-1"
                          style={{ width: `${stats.wins > 0 ? (count / stats.wins) * 100 : 0}%`, minWidth: count > 0 ? '20px' : '0' }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    Recent Games
                  </h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {gameHistory.slice(-5).reverse().map((game, index) => (
                      <div key={index} className={`flex justify-between items-center text-xs p-2 rounded ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <span className={`font-mono ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                          {game.word}
                        </span>
                        <span className={`font-semibold ${game.won ? 'text-green-600' : 'text-red-600'}`}>
                          {game.won ? `✓ ${game.guesses}/6` : '✗ Lost'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Today's Result Modal */}
        {showTodayModal && todayGameData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowTodayModal(false)}>
            <div
              className={`max-w-md w-full rounded-lg shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  📅 Today's Result
                </h2>
                <button
                  onClick={() => setShowTodayModal(false)}
                  className={`text-2xl font-bold ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  ×
                </button>
              </div>

              {/* Game Result Status */}
              <div className="text-center mb-4">
                {todayGameData.gameStatus === 'won' ? (
                  <div className="text-green-600 font-bold text-lg">
                    🎉 You Won! 🎉
                    <div className="text-sm mt-1">
                      Solved in {todayGameData.guesses.length}/{maxGuesses} attempts
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600 font-bold text-lg">
                    😔 Game Over
                    <div className="text-sm mt-1">
                      The word was: {todayGameData.targetWord}
                    </div>
                  </div>
                )}
              </div>

              {/* Game Board */}
              <div className="grid grid-rows-6 gap-1 sm:gap-2 mb-4">
                {Array.from({ length: maxGuesses }).map((_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-5 gap-1 sm:gap-2">
                    {Array.from({ length: wordLength }).map((_, colIndex) => {
                      let letter = '';
                      let status = '';

                      if (rowIndex < todayGameData.guesses.length) {
                        letter = todayGameData.guesses[rowIndex].word[colIndex];
                        status = todayGameData.guesses[rowIndex].result[colIndex];
                      }

                      return (
                        <div
                          key={colIndex}
                          className={getCellStyle(status, !!letter)}
                        >
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Word Meaning */}
              {todayGameData.meaning && (
                <div className={`p-3 sm:p-4 rounded-lg ${
                  darkMode
                    ? 'bg-blue-900 border border-blue-700'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-bold text-base sm:text-lg ${
                      darkMode ? 'text-blue-300' : 'text-blue-800'
                    }`}>
                      Word: {todayGameData.meaning.word}
                      {todayGameData.meaning.phonetic && (
                        <span className={`text-xs sm:text-sm font-normal ml-2 ${
                          darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {todayGameData.meaning.phonetic}
                        </span>
                      )}
                      {todayGameData.meaning.hindi_translation && (
                        <span className={`text-sm font-normal ml-2 ${
                          darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {todayGameData.meaning.hindi_translation}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => pronounceWord(todayGameData.meaning.word)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                        darkMode
                          ? 'bg-blue-700 text-blue-200 hover:bg-blue-600'
                          : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                      }`}
                      title="Pronounce word"
                    >
                      🔊 Pronounce
                    </button>
                  </div>
                  {todayGameData.meaning.meanings && todayGameData.meaning.meanings.map((meaning, index) => (
                    <div key={index} className="mb-2 text-sm sm:text-base">
                      <span className={`font-semibold capitalize ${
                        darkMode ? 'text-blue-400' : 'text-blue-700'
                      }`}>
                        {meaning.partOfSpeech}:
                      </span>
                      <span className={`ml-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                        {meaning.definition}
                        {meaning.example && (
                          <div className={`text-xs mt-1 italic ${
                            darkMode ? 'text-blue-300' : 'text-blue-600'
                          }`}>
                            <strong>Example:</strong> {meaning.example}
                          </div>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowTodayModal(false)}
                className="w-full mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {gameStatus === 'loading' && (
          <div className="text-center mb-6">
            <div className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Loading word...
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded text-sm ${
            darkMode
              ? 'bg-yellow-900 border border-yellow-600 text-yellow-200'
              : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
          }`}>
            {error}
          </div>
        )}

        {/* Validation Message */}
        {validationMessage && (
          <div className={`mb-4 p-3 rounded text-sm text-center font-semibold ${
            validationMessage.includes('valid English word')
              ? darkMode
                ? 'bg-red-900 border border-red-600 text-red-200'
                : 'bg-red-100 border border-red-400 text-red-700'
              : validationMessage.includes('Checking word')
              ? darkMode
                ? 'bg-blue-900 border border-blue-600 text-blue-200'
                : 'bg-blue-100 border border-blue-400 text-blue-700'
              : darkMode
                ? 'bg-orange-900 border border-orange-600 text-orange-200'
                : 'bg-orange-100 border border-orange-400 text-orange-700'
          }`}>
            {validationMessage}
          </div>
        )}

        {/* Game Board */}
        {gameStatus !== 'loading' && (
          <>
            <div className={`grid grid-rows-6 gap-1 sm:gap-2 mb-4 sm:mb-6 ${shake ? 'animate-pulse' : ''}`}>
              {Array.from({ length: maxGuesses }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-1 sm:gap-2">
                  {Array.from({ length: wordLength }).map((_, colIndex) => {
                    let letter = '';
                    let status = '';

                    if (rowIndex < guesses.length) {
                      letter = guesses[rowIndex].word[colIndex];
                      status = guesses[rowIndex].result[colIndex];
                    } else if (rowIndex === guesses.length && gameStatus === 'playing') {
                      letter = currentGuess[colIndex] || '';
                    }

                    return (
                      <div
                        key={colIndex}
                        className={getCellStyle(status, !!letter)}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Game Status */}
            {gameStatus !== 'playing' && (
              <div className="text-center mb-4 sm:mb-6">
                {gameStatus === 'won' ? (
                  <div className="text-green-600 font-bold text-lg sm:text-xl">
                    🎉 Congratulations! You won! 🎉
                    {isPlayingTodayWord && (
                      <div className="text-sm mt-2 text-orange-600">
                        Streak: {currentStreak} day{currentStreak !== 1 ? 's' : ''}! 🔥
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600 font-bold text-lg sm:text-xl">
                    😔 Game Over! The word was: {targetWord}
                    {isPlayingTodayWord && currentStreak > 0 && (
                      <div className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Your streak has been reset. Try again tomorrow!
                      </div>
                    )}
                  </div>
                )}

                {/* Word Meaning Display - Only show when game is over (won OR lost) AND meaning exists */}
                {(gameStatus === 'won' || gameStatus === 'lost') && wordMeaning && (
                  <div className={`mt-4 p-3 sm:p-4 rounded-lg text-left ${
                    darkMode
                      ? 'bg-blue-900 border border-blue-700'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-bold text-base sm:text-lg ${
                        darkMode ? 'text-blue-300' : 'text-blue-800'
                      }`}>
                        Word: {wordMeaning.word}
                        {wordMeaning.phonetic && (
                          <span className={`text-xs sm:text-sm font-normal ml-2 ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            {wordMeaning.phonetic}
                          </span>
                        )}
                        {wordMeaning.hindi_translation && (
                          <span className={`text-sm font-normal ml-2 ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            {wordMeaning.hindi_translation}
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => pronounceWord(wordMeaning.word)}
                        className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                          darkMode
                            ? 'bg-blue-700 text-blue-200 hover:bg-blue-600'
                            : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                        }`}
                        title="Pronounce word"
                      >
                        🔊 Pronounce
                      </button>
                    </div>
                    {wordMeaning.meanings && wordMeaning.meanings.map((meaning, index) => (
                      <div key={index} className="mb-2 text-sm sm:text-base">
                        <span className={`font-semibold capitalize ${
                          darkMode ? 'text-blue-400' : 'text-blue-700'
                        }`}>
                          {meaning.partOfSpeech}:
                        </span>
                        <span className={`ml-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                          {meaning.definition}
                          {meaning.example && (
                            <div className={`text-xs mt-1 italic ${
                              darkMode ? 'text-blue-300' : 'text-blue-600'
                            }`}>
                              <strong>Example:</strong> {meaning.example}
                            </div>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-x-2">
                  {isPlayingTodayWord && isTodayWordCompleted() ? (
                    <button
                      onClick={fetchNewWord}
                      className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm sm:text-base"
                    >
                      Practice with New Word
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={resetGame}
                        className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm sm:text-base"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={fetchNewWord}
                        className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm sm:text-base"
                      >
                        New Word
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Virtual Keyboard */}
            <div className="space-y-1 sm:space-y-2">
              {keyboard.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center">
                  {row.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeyClick(key)}
                      className={`${getKeyStyle(key)} ${
                        key === 'ENTER' || key === '⌫' ? 'px-3 sm:px-4' : ''
                      } ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={gameStatus !== 'playing' || isValidating}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className={`text-center mt-3 sm:mt-4 text-xs sm:text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Use your keyboard or click the letters above to play!
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wordle;
