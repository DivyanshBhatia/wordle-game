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

  const maxGuesses = 6;
  const wordLength = 5;

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

  const validateWord = async (word) => {
    try {
      const meaning = await fetchWordMeaning(word);
      return meaning !== null && meaning.meanings && meaning.meanings.length > 0;
    } catch (err) {
      console.error('Error validating word:', err);
      return false;
    }
  };

  const fetchTodaysWord = async () => {
    try {
      setGameStatus('loading');
      setError('');
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
      resetGame();
    }
  };

  // Fetch today's word on component mount
  useEffect(() => {
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

      setGuesses(newGuesses);
      updateUsedLetters(currentGuess, result);
      setGameStatus('won');
      setCurrentGuess('');
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

    setGuesses(newGuesses);
    updateUsedLetters(currentGuess, result);

    if (currentGuess === targetWord) {
      setGameStatus('won');
    } else if (newGuesses.length >= maxGuesses) {
      setGameStatus('lost');
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
        return `${baseStyle} bg-gray-500 border-gray-500 text-white`;
      default:
        return `${baseStyle} bg-gray-100 border-gray-300 ${hasLetter ? 'text-black border-gray-500' : 'text-black'}`;
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
        return `${baseStyle} bg-gray-500 text-white`;
      default:
        return `${baseStyle} bg-gray-200 text-black`;
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="max-w-md w-full px-2 sm:px-0">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 text-gray-800">Wordle</h1>

        {/* Loading State */}
        {gameStatus === 'loading' && (
          <div className="text-center mb-6">
            <div className="text-base sm:text-lg font-semibold">Loading word...</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* Validation Message */}
        {validationMessage && (
          <div className={`mb-4 p-3 rounded text-sm text-center font-semibold ${
            validationMessage.includes('valid English word')
              ? 'bg-red-100 border border-red-400 text-red-700'
              : validationMessage.includes('Checking word')
              ? 'bg-blue-100 border border-blue-400 text-blue-700'
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
                    } else if (rowIndex === guesses.length) {
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
                  </div>
                ) : (
                  <div className="text-red-600 font-bold text-lg sm:text-xl">
                    😔 Game Over! The word was: {targetWord}
                  </div>
                )}

                {/* Word Meaning Display - Only show when game is over (won OR lost) AND meaning exists */}
                {(gameStatus === 'won' || gameStatus === 'lost') && wordMeaning && (
                  <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                    <h3 className="font-bold text-base sm:text-lg text-blue-800 mb-2">
                      Word: {wordMeaning.word}
                      {wordMeaning.phonetic && (
                        <span className="text-xs sm:text-sm font-normal text-blue-600 ml-2">
                          {wordMeaning.phonetic}
                        </span>
                      )}
                    </h3>
                    {wordMeaning.meanings && wordMeaning.meanings.map((meaning, index) => (
                      <div key={index} className="mb-2 text-sm sm:text-base">
                        <span className="font-semibold text-blue-700 capitalize">
                          {meaning.partOfSpeech}:
                        </span>
                        <span className="text-blue-800 ml-1">
                          {meaning.definition}
                          {meaning.example && (
                            <div><strong>Example:</strong> {meaning.example}</div>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-x-2">
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

            <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
              Use your keyboard or click the letters above to play!
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wordle;
