import React, { useState, useEffect, useCallback } from 'react';

const Wordle = () => {
  const [targetWord, setTargetWord] = useState('');
  const [wordMeaning, setWordMeaning] = useState(null);
  const [customWord, setCustomWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('loading');
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

  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState('09:00');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

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

  // Notification management functions
  const loadNotificationPreferences = () => {
    const enabled = getCookie('wordleNotificationsEnabled') === 'true';
    const time = getCookie('wordleNotificationTime') || '09:00';
    setNotificationsEnabled(enabled);
    setNotificationTime(time);

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === 'granted';
  };

  const sendNotification = () => {
    if (notificationPermission === 'granted' && notificationsEnabled) {
      const todayCompleted = isTodayWordCompleted();

      if (!todayCompleted) {
        new Notification('Wordle Daily Reminder! 📝', {
          body: "Don't forget to play today's word! Keep your streak going! 🔥",
          icon: '📝',
          badge: '📝',
          tag: 'wordle-daily-reminder',
          requireInteraction: false
        });
      }
    }
  };

  const scheduleNotification = useCallback(() => {
    if (!notificationsEnabled || notificationPermission !== 'granted') {
      return;
    }

    const now = new Date();
    const [hours, minutes] = notificationTime.split(':').map(Number);

    // Create notification time for today
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // If scheduled time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime - now;

    // Clear any existing timeout
    const existingTimeout = getCookie('wordleNotificationTimeout');
    if (existingTimeout) {
      clearTimeout(parseInt(existingTimeout));
    }

    // Schedule the notification
    const timeoutId = setTimeout(() => {
      sendNotification();
      // Schedule next day's notification
      scheduleNotification();
    }, timeUntilNotification);

    // Store timeout ID (though it won't persist across page refreshes)
    setCookie('wordleNotificationTimeout', timeoutId.toString(), 1);
  }, [notificationsEnabled, notificationTime, notificationPermission]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      // User wants to enable notifications
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        setCookie('wordleNotificationsEnabled', 'true', 365);
        scheduleNotification();
      }
    } else {
      // User wants to disable notifications
      setNotificationsEnabled(false);
      setCookie('wordleNotificationsEnabled', 'false', 365);
    }
  };

  const updateNotificationTime = (newTime) => {
    setNotificationTime(newTime);
    setCookie('wordleNotificationTime', newTime, 365);

    if (notificationsEnabled && notificationPermission === 'granted') {
      scheduleNotification();
    }
  };

  // Load notification preferences on mount
  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  // Schedule notifications when enabled and time changes
  useEffect(() => {
    if (notificationsEnabled && notificationPermission === 'granted') {
      scheduleNotification();
    }
  }, [notificationsEnabled, notificationTime, notificationPermission, scheduleNotification]);

  // Check for notification on page load (in case user opens the app at notification time)
  useEffect(() => {
    const checkAndNotify = () => {
      if (notificationsEnabled && notificationPermission === 'granted') {
        const lastNotificationDate = getCookie('wordleLastNotification');
        const today = getTodayDateString();

        // Only send notification once per day
        if (lastNotificationDate !== today) {
          const now = new Date();
          const [hours, minutes] = notificationTime.split(':').map(Number);
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          // Check if we're within 5 minutes of the notification time
          if (currentHour === hours && Math.abs(currentMinute - minutes) <= 5) {
            sendNotification();
            setCookie('wordleLastNotification', today, 1);
          }
        }
      }
    };

    checkAndNotify();
  }, [notificationsEnabled, notificationTime, notificationPermission]);

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
    const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const kolkataDate = new Date(today);
    const year = kolkataDate.getFullYear();
    const month = String(kolkataDate.getMonth() + 1).padStart(2, '0');
    const day = String(kolkataDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayDateString = () => {
    const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const kolkataDate = new Date(today);
    kolkataDate.setDate(kolkataDate.getDate() - 1);
    const year = kolkataDate.getFullYear();
    const month = String(kolkataDate.getMonth() + 1).padStart(2, '0');
    const day = String(kolkataDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Today's game session management
  const getTodayGameSession = () => {
    const sessionData = getCookie('wordleTodaySession');
    if (sessionData) {
      try {
        const data = JSON.parse(decodeURIComponent(sessionData));
        const today = getTodayDateString();

        if (data.date === today) {
          return data;
        } else {
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

    if (won) {
      const yesterday = getYesterdayDateString();
      let newCurrentStreak = 1;

      if (streakData.lastWonDate === yesterday) {
        newCurrentStreak = (streakData.currentStreak || 0) + 1;
      } else if (streakData.lastWonDate === today) {
        newCurrentStreak = streakData.currentStreak;
      }

      const newMaxStreak = Math.max(newCurrentStreak, streakData.maxStreak || 0);

      const newStreakData = {
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        lastWonDate: today
      };

      setCookie('wordleStreak', encodeURIComponent(JSON.stringify(newStreakData)), 365);
      setCurrentStreak(newCurrentStreak);
      setMaxStreak(newMaxStreak);
    } else {
      if (streakData.lastWonDate !== today) {
        const newStreakData = {
          currentStreak: 0,
          maxStreak: streakData.maxStreak || 0,
          lastWonDate: ''
        };
        setCookie('wordleStreak', encodeURIComponent(JSON.stringify(newStreakData)), 365);
        setCurrentStreak(0);
      }
    }
  };

  const saveGameHistory = (gameResult) => {
    const history = loadGameHistory();
    history.push(gameResult);

    const last100 = history.slice(-100);
    setCookie('wordleHistory', encodeURIComponent(JSON.stringify(last100)), 365);
    setGameHistory(last100);
  };

  const loadGameHistory = () => {
    const historyData = getCookie('wordleHistory');
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

  useEffect(() => {
    loadGameHistory();
    loadStreakData();
    loadDailyWordStats();
  }, []);

  const getDailyWord = useCallback(async () => {
    const today = getTodayDateString();
    const existingSession = getTodayGameSession();

    if (existingSession) {
      setTargetWord(existingSession.targetWord);
      setGuesses(existingSession.guesses || []);
      setGameStatus(existingSession.gameStatus);
      setUsedLetters(existingSession.usedLetters || {});
      setIsPlayingTodayWord(true);
      setTodayWordCompleted(existingSession.gameStatus === 'won' || existingSession.gameStatus === 'lost');

      if (existingSession.gameStatus === 'won' || existingSession.gameStatus === 'lost') {
        const meaning = await fetchWordMeaning(existingSession.targetWord);
        setWordMeaning(meaning);
      }
      return;
    }

    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(today)
    );
    const hashArray = Array.from(new Uint8Array(hash));
    const seed = hashArray.reduce((acc, byte) => acc + byte, 0);

    const commonWords = [
      'AUDIO', 'ABOUT', 'AFTER', 'AGAIN', 'ALLOW', 'ALONE', 'ALONG', 'AMONG',
      'ANGEL', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE',
      'ARISE', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY',
      'BIRTH', 'BLACK', 'BLAME', 'BLOOD', 'BOARD', 'BOOST', 'BOOTH', 'BOUND',
      'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRING', 'BROAD',
      'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF', 'CARRY',
      'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK',
      'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CLAIM', 'CLASS', 'CLEAN',
      'CLEAR', 'CLICK', 'CLOCK', 'CLOSE', 'COACH', 'COAST', 'COULD', 'COUNT',
      'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS',
      'CROWD', 'CROWN', 'CRUDE', 'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH',
      'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA',
      'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING',
      'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY',
      'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST',
      'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY',
      'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FLUID',
      'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK',
      'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN',
      'GLASS', 'GLOBE', 'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS',
      'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST',
      'GUIDE', 'HAPPY', 'HARRY', 'HEART', 'HEAVY', 'HENRY', 'HORSE', 'HOTEL',
      'HOUSE', 'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE',
      'JAPAN', 'JIMMY', 'JOINT', 'JONES', 'JUDGE', 'KNOWN', 'LABEL', 'LARGE',
      'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE',
      'LEGAL', 'LEMON', 'LEVEL', 'LIGHT', 'LIMIT', 'LOCAL', 'LOGIC', 'LOOSE',
      'LOWER', 'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH',
      'MARIA', 'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT',
      'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR',
      'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NEEDS', 'NEVER', 'NEWLY',
      'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN',
      'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER',
      'PARTY', 'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT',
      'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND',
      'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE',
      'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO',
      'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER', 'RIGHT',
      'RIVER', 'ROBIN', 'ROGER', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL',
      'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN',
      'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT',
      'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SINCE',
      'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART',
      'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH',
      'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE',
      'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM',
      'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM',
      'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE',
      'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEENS',
      'TEETH', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE',
      'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW',
      'THROW', 'TIGHT', 'TIMES', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH',
      'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL',
      'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TROOP', 'TRUCK', 'TRULY', 'TRUMP',
      'TRUST', 'TRUTH', 'TWICE', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL',
      'UPPER', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS',
      'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL',
      'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN',
      'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE',
      'WRONG', 'WROTE', 'YOUNG', 'YOUTH'
    ];

    const wordIndex = seed % commonWords.length;
    const selectedWord = commonWords[wordIndex];

    setTargetWord(selectedWord);
    setGuesses([]);
    setGameStatus('playing');
    setUsedLetters({});
    setIsPlayingTodayWord(true);
    setTodayWordCompleted(false);

    saveTodayGameSession({
      date: today,
      targetWord: selectedWord,
      guesses: [],
      gameStatus: 'playing',
      usedLetters: {}
    });
  }, []);

  const fetchNewWord = useCallback(async () => {
    setGameStatus('loading');
    setError('');
    setIsPlayingTodayWord(false);

    try {
      const response = await fetch('https://random-word-api.herokuapp.com/word?length=5');
      const data = await response.json();
      const word = data[0].toUpperCase();

      setTargetWord(word);
      setWordMeaning(null);
      resetGame();
    } catch (err) {
      setError('Failed to fetch word. Please try again.');
      setGameStatus('playing');
    }
  }, []);

  const fetchWordMeaning = async (word) => {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (!response.ok) return null;

      const data = await response.json();
      if (data && data.length > 0) {
        const entry = data[0];
        const meanings = entry.meanings.slice(0, 2).map(m => ({
          partOfSpeech: m.partOfSpeech,
          definition: m.definitions[0].definition,
          example: m.definitions[0].example
        }));

        return {
          word: entry.word.toUpperCase(),
          phonetic: entry.phonetic || entry.phonetics[0]?.text,
          meanings: meanings
        };
      }
    } catch (err) {
      console.error('Error fetching word meaning:', err);
    }
    return null;
  };

  const validateWord = async (word) => {
    try {
      setIsValidating(true);
      setValidationMessage('Checking word...');

      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      const isValid = response.ok;

      setValidationMessage('');
      setIsValidating(false);
      return isValid;
    } catch (err) {
      setValidationMessage('');
      setIsValidating(false);
      return false;
    }
  };

  useEffect(() => {
    getDailyWord();
  }, [getDailyWord]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameStatus !== 'playing' || isValidating) return;

      if (e.key === 'Enter') {
        handleSubmitGuess();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleLetterInput(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentGuess, gameStatus, isValidating]);

  const handleLetterInput = (letter) => {
    if (currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + letter);
    }
  };

  const handleBackspace = () => {
    setCurrentGuess(prev => prev.slice(0, -1));
  };

  const handleSubmitGuess = async () => {
    if (currentGuess.length !== wordLength) {
      setValidationMessage(`Word must be ${wordLength} letters long`);
      setTimeout(() => setValidationMessage(''), 2000);
      return;
    }

    const isValid = await validateWord(currentGuess);
    if (!isValid) {
      setValidationMessage('Not a valid English word');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setValidationMessage('');
      }, 500);
      return;
    }

    const result = Array(wordLength).fill('absent');
    const targetLetters = targetWord.split('');
    const guessLetters = currentGuess.split('');

    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = 'correct';
        targetLetters[i] = null;
      }
    });

    guessLetters.forEach((letter, i) => {
      if (result[i] !== 'correct' && targetLetters.includes(letter)) {
        result[i] = 'present';
        targetLetters[targetLetters.indexOf(letter)] = null;
      }
    });

    const newGuess = { word: currentGuess, result };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);

    const newUsedLetters = { ...usedLetters };
    currentGuess.split('').forEach((letter, i) => {
      const currentStatus = newUsedLetters[letter];
      const newStatus = result[i];
      if (
        !currentStatus ||
        (newStatus === 'correct') ||
        (newStatus === 'present' && currentStatus !== 'correct')
      ) {
        newUsedLetters[letter] = newStatus;
      }
    });
    setUsedLetters(newUsedLetters);

    setCurrentGuess('');

    const hasWon = result.every(r => r === 'correct');
    let newGameStatus = 'playing';

    if (hasWon) {
      newGameStatus = 'won';
      setGameStatus('won');

      const gameResult = {
        date: new Date().toISOString(),
        word: targetWord,
        guesses: newGuesses.length,
        won: true,
        isTodayWord: isPlayingTodayWord
      };

      saveGameHistory(gameResult);

      if (isPlayingTodayWord) {
        updateStreak(true);
        setTodayWordCompleted(true);
        updateDailyWordStats(newGuesses.length);
      }

      const meaning = await fetchWordMeaning(targetWord);
      setWordMeaning(meaning);
    } else if (newGuesses.length >= maxGuesses) {
      newGameStatus = 'lost';
      setGameStatus('lost');

      const gameResult = {
        date: new Date().toISOString(),
        word: targetWord,
        guesses: maxGuesses,
        won: false,
        isTodayWord: isPlayingTodayWord
      };

      saveGameHistory(gameResult);

      if (isPlayingTodayWord) {
        updateStreak(false);
        setTodayWordCompleted(true);
      }

      const meaning = await fetchWordMeaning(targetWord);
      setWordMeaning(meaning);
    }

    if (isPlayingTodayWord) {
      saveTodayGameSession({
        date: getTodayDateString(),
        targetWord: targetWord,
        guesses: newGuesses,
        gameStatus: newGameStatus,
        usedLetters: newUsedLetters
      });
    }
  };

  const resetGame = () => {
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setUsedLetters({});
    setWordMeaning(null);
  };

  const handleKeyClick = (key) => {
    if (key === 'ENTER') {
      handleSubmitGuess();
    } else if (key === '⌫') {
      handleBackspace();
    } else {
      handleLetterInput(key);
    }
  };

  const getCellStyle = (status, hasLetter) => {
    const baseStyle = `
      w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
      flex items-center justify-center
      text-lg sm:text-xl md:text-2xl font-bold
      border-2 rounded transition-all duration-300
    `;

    if (!hasLetter) {
      return `${baseStyle} ${
        darkMode
          ? 'border-gray-600 bg-gray-800 text-white'
          : 'border-gray-300 bg-white text-gray-800'
      }`;
    }

    if (status === 'correct') {
      return `${baseStyle} bg-green-500 border-green-500 text-white`;
    } else if (status === 'present') {
      return `${baseStyle} bg-yellow-500 border-yellow-500 text-white`;
    } else if (status === 'absent') {
      return `${baseStyle} ${
        darkMode
          ? 'bg-gray-700 border-gray-700 text-white'
          : 'bg-gray-400 border-gray-400 text-white'
      }`;
    }

    return `${baseStyle} ${
      darkMode
        ? 'border-gray-600 bg-gray-800 text-white'
        : 'border-gray-300 bg-white text-gray-800'
    }`;
  };

  const getKeyStyle = (key) => {
    const status = usedLetters[key];
    const baseStyle = `
      m-0.5 sm:m-1 px-2 py-2 sm:px-3 sm:py-3
      text-xs sm:text-sm font-bold rounded
      transition-all duration-200
    `;

    if (status === 'correct') {
      return `${baseStyle} bg-green-500 text-white`;
    } else if (status === 'present') {
      return `${baseStyle} bg-yellow-500 text-white`;
    } else if (status === 'absent') {
      return `${baseStyle} ${
        darkMode
          ? 'bg-gray-700 text-white'
          : 'bg-gray-400 text-white'
      }`;
    }

    return `${baseStyle} ${
      darkMode
        ? 'bg-gray-600 text-white hover:bg-gray-500'
        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
    }`;
  };

  const keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];

  const calculateStats = () => {
    const totalGames = gameHistory.length;
    const wins = gameHistory.filter(g => g.won).length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    const guessDistribution = [0, 0, 0, 0, 0, 0];
    gameHistory.filter(g => g.won).forEach(game => {
      if (game.guesses >= 1 && game.guesses <= 6) {
        guessDistribution[game.guesses - 1]++;
      }
    });

    return { totalGames, wins, winRate, guessDistribution };
  };

  const stats = calculateStats();

  const setCustomWordHandler = async () => {
    if (customWord.length !== wordLength) {
      setError(`Word must be exactly ${wordLength} letters`);
      return;
    }

    const upperWord = customWord.toUpperCase();
    const isValid = await validateWord(upperWord);

    if (!isValid) {
      setError('Please enter a valid English word');
      return;
    }

    setTargetWord(upperWord);
    setCustomWord('');
    setIsPlayingTodayWord(false);
    resetGame();
  };

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-100 to-blue-100'
    } flex items-center justify-center p-2 sm:p-4 transition-colors duration-300`}>
      <div className={`w-full max-w-md sm:max-w-lg ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      } rounded-xl shadow-2xl p-4 sm:p-6 md:p-8`}>

        {/* Header with Dark Mode, Notification, and Stats Toggle */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
            title="Toggle Dark Mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-center ${
            darkMode ? 'text-white' : 'text-purple-600'
          }`}>
            Wordle Game
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() => setShowNotificationSettings(!showNotificationSettings)}
              className={`p-2 rounded-lg ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } ${notificationsEnabled ? 'ring-2 ring-green-500' : ''}`}
              title="Notification Settings"
            >
              🔔
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
              title="View Statistics"
            >
              📊
            </button>
          </div>
        </div>

        {/* Notification Settings Modal */}
        {showNotificationSettings && (
          <div className={`mb-4 p-4 rounded-lg ${
            darkMode
              ? 'bg-gray-700 border border-gray-600'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Daily Reminder Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Enable Daily Reminders
                </span>
                <button
                  onClick={toggleNotifications}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-green-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {notificationsEnabled && (
                <div>
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Reminder Time:
                  </label>
                  <input
                    type="time"
                    value={notificationTime}
                    onChange={(e) => updateNotificationTime(e.target.value)}
                    className={`w-full px-3 py-2 rounded border ${
                      darkMode
                        ? 'bg-gray-600 border-gray-500 text-white'
                        : 'bg-white border-gray-300 text-gray-800'
                    }`}
                  />
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    You'll receive a reminder to play Wordle at this time each day (if you haven't completed today's word)
                  </p>
                </div>
              )}

              {notificationPermission === 'denied' && (
                <div className={`text-xs p-2 rounded ${
                  darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
                }`}>
                  Notifications are blocked. Please enable them in your browser settings.
                </div>
              )}

              {notificationsEnabled && notificationPermission === 'granted' && (
                <button
                  onClick={sendNotification}
                  className={`w-full px-3 py-2 text-sm rounded ${
                    darkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  Test Notification
                </button>
              )}
            </div>

            <button
              onClick={() => setShowNotificationSettings(false)}
              className={`w-full mt-3 px-3 py-2 text-sm rounded ${
                darkMode
                  ? 'bg-gray-600 hover:bg-gray-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Close
            </button>
          </div>
        )}

        {/* Today's Word Indicator */}
        {isPlayingTodayWord && (
          <div className="text-center mb-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
              darkMode
                ? 'bg-purple-900 text-purple-200 border border-purple-700'
                : 'bg-purple-200 text-purple-800 border border-purple-300'
            }`}>
              📅 Today's Word
              {todayWordCompleted && (
                <span className="ml-2">✓ Completed</span>
              )}
            </div>
            {todayWordCompleted && (
              <button
                onClick={handleShowTodayResult}
                className="mt-2 text-sm text-blue-500 hover:text-blue-600 underline"
              >
                View Today's Result
              </button>
            )}
          </div>
        )}

        {/* Custom Word Input */}
        <div className={`mb-4 p-3 rounded-lg ${
          darkMode
            ? 'bg-gray-700 border border-gray-600'
            : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value.toUpperCase())}
              placeholder="Enter custom word..."
              maxLength={wordLength}
              className={`flex-1 px-3 py-2 text-sm rounded border ${
                darkMode
                  ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
              }`}
              disabled={gameStatus !== 'playing' || isValidating}
            />
            <button
              onClick={setCustomWordHandler}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-semibold disabled:opacity-50"
              disabled={gameStatus !== 'playing' || isValidating}
            >
              Set
            </button>
          </div>
        </div>

        {/* Statistics Modal */}
        {showStats && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Statistics
                </h2>
                <button
                  onClick={() => setShowStats(false)}
                  className={`text-2xl ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  ×
                </button>
              </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {stats.totalGames}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Played
                  </div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {stats.winRate}%
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Win %
                  </div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {currentStreak}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Current
                  </div>
                </div>
                <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {maxStreak}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Max
                  </div>
                </div>
              </div>

              {/* Guess Distribution */}
              <div className="mb-6">
                <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Guess Distribution
                </h3>
                {stats.guessDistribution.map((count, index) => {
                  const maxCount = Math.max(...stats.guessDistribution, 1);
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <div className={`w-4 text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div
                          className="bg-green-500 text-white text-xs px-2 py-1 rounded text-right min-w-[2rem]"
                          style={{ width: `${Math.max(percentage, 7)}%` }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Toggle for Daily Word Stats */}
              <button
                onClick={() => setShowDailyStats(!showDailyStats)}
                className="w-full mb-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold"
              >
                {showDailyStats ? 'Hide' : 'Show'} Daily Word Stats
              </button>

              {/* Daily Word Stats */}
              {showDailyStats && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Daily Word Performance
                  </h3>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((attempt) => {
                      const count = dailyWordStats[`attempt${attempt}`] || 0;
                      const maxCount = Math.max(
                        ...Object.values(dailyWordStats).filter((v, i) => i < 6),
                        1
                      );
                      const percentage = (count / maxCount) * 100;
                      return (
                        <div key={attempt} className="flex items-center gap-2">
                          <div className={`w-4 text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {attempt}
                          </div>
                          <div className="flex-1">
                            <div
                              className="bg-blue-500 text-white text-xs px-2 py-1 rounded text-right min-w-[2rem]"
                              style={{ width: `${Math.max(percentage, 7)}%` }}
                            >
                              {count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`mt-3 text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Daily Wins: {dailyWordStats.totalWins}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowStats(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Today's Word Modal */}
        {showTodayModal && todayGameData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-lg p-6 max-w-md w-full`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Today's Word: {todayGameData.targetWord}
              </h2>

              <div className={`mb-4 text-center p-3 rounded ${
                todayGameData.gameStatus === 'won'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className="text-lg font-bold">
                  {todayGameData.gameStatus === 'won' ? '🎉 You Won!' : '😔 You Lost'}
                </div>
                <div className="text-sm">
                  {todayGameData.gameStatus === 'won'
                    ? `Solved in ${todayGameData.guesses.length} ${todayGameData.guesses.length === 1 ? 'guess' : 'guesses'}`
                    : `Better luck tomorrow!`
                  }
                </div>
              </div>

              {/* Show guesses */}
              <div className="grid grid-rows-6 gap-2 mb-4">
                {Array.from({ length: maxGuesses }).map((_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-5 gap-2">
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

              {/* Word meaning */}
              {todayGameData.meaning && (
                <div className={`p-4 rounded-lg text-left ${
                  darkMode
                    ? 'bg-blue-900 border border-blue-700'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <h3 className={`font-bold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    Word: {todayGameData.meaning.word}
                    {todayGameData.meaning.phonetic && (
                      <span className={`text-sm font-normal ml-2 ${
                        darkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        {todayGameData.meaning.phonetic}
                      </span>
                    )}
                  </h3>
                  {todayGameData.meaning.meanings && todayGameData.meaning.meanings.map((meaning, index) => (
                    <div key={index} className="mb-2 text-sm">
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

                {/* Word Meaning Display */}
                {(gameStatus === 'won' || gameStatus === 'lost') && wordMeaning && (
                  <div className={`mt-4 p-3 sm:p-4 rounded-lg text-left ${
                    darkMode
                      ? 'bg-blue-900 border border-blue-700'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <h3 className={`font-bold text-base sm:text-lg mb-2 ${
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
