import React, { useState, useEffect, useCallback } from 'react';

const Wordle = () => {
  const [targetWord, setTargetWord] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('loading'); // 'loading', 'playing', 'won', 'lost'
  const [shake, setShake] = useState(false);
  const [usedLetters, setUsedLetters] = useState({});
  const [error, setError] = useState('');

  const maxGuesses = 6;
  const wordLength = 5;

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

      if (data.success && data.solution) {
        const solution = data.solution.toUpperCase();
        setTargetWord(solution);
        setGameStatus('playing');
        resetGame();
      } else {
        // Handle API error response
        throw new Error(data.error || 'API returned error');
      }
    } catch (err) {
      console.error('Error fetching today\'s word:', err);
      setError(`Could not fetch today's word: ${err.message}`);
      setTargetWord('REACT');
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
    if (gameStatus !== 'loading') {
      setGameStatus('playing');
    }
  }, [gameStatus]);

  const setNewWord = () => {
    if (customWord.length === wordLength && /^[A-Za-z]+$/.test(customWord)) {
      setTargetWord(customWord.toUpperCase());
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

  const submitGuess = () => {
    if (currentGuess.length !== wordLength) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

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
    if (gameStatus !== 'playing') return;

    if (e.key === 'Enter') {
      submitGuess();
    } else if (e.key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Za-z]$/.test(e.key) && currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + e.key.toUpperCase());
    }
  }, [currentGuess, gameStatus]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const getCellStyle = (status) => {
    const baseStyle = "w-14 h-14 border-2 flex items-center justify-center text-2xl font-bold text-white transition-all duration-300";
    switch (status) {
      case 'correct':
        return `${baseStyle} bg-green-500 border-green-500`;
      case 'present':
        return `${baseStyle} bg-yellow-500 border-yellow-500`;
      case 'absent':
        return `${baseStyle} bg-gray-500 border-gray-500`;
      default:
        return `${baseStyle} bg-gray-100 border-gray-300 text-black`;
    }
  };

  const getKeyStyle = (letter) => {
    const baseStyle = "px-3 py-4 m-1 rounded font-bold cursor-pointer transition-all duration-200 hover:opacity-80";
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
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === '⌫') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < wordLength) {
      setCurrentGuess(prev => prev + key);
    }
  };

  const keyboard = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Wordle</h1>

        {/* Loading State */}
        {gameStatus === 'loading' && (
          <div className="text-center mb-6">
            <div className="text-lg font-semibold">Loading today's word...</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {error}
          </div>
        )}

        {/* Word Input Section */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Today's Wordle</h2>
            <button
              onClick={fetchTodaysWord}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              disabled={gameStatus === 'loading'}
            >
              {gameStatus === 'loading' ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value.toUpperCase())}
              placeholder="Or set custom word"
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
              maxLength={wordLength}
            />
            <button
              onClick={setNewWord}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Set
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {targetWord ? (
              <div className="flex items-center gap-2">
                <span>Playing today's word:</span>
                <span className="font-mono text-lg">🔤🔤🔤🔤🔤</span>
                <span className="text-xs text-gray-500">({targetWord.length} letters)</span>
              </div>
            ) : (
              'Loading...'
            )}
          </div>
        </div>

        {/* Game Board */}
        {gameStatus !== 'loading' && (
          <>
            <div className={`grid grid-rows-6 gap-2 mb-6 ${shake ? 'animate-pulse' : ''}`}>
              {Array.from({ length: maxGuesses }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-5 gap-2">
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
                        className={getCellStyle(status)}
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
              <div className="text-center mb-6">
                {gameStatus === 'won' ? (
                  <div className="text-green-600 font-bold text-xl">
                    🎉 Congratulations! You won! 🎉
                  </div>
                ) : (
                  <div className="text-red-600 font-bold text-xl">
                    😔 Game Over! The word was: {targetWord}
                  </div>
                )}
                <div className="mt-2 space-x-2">
                  <button
                    onClick={resetGame}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={fetchTodaysWord}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    New Word
                  </button>
                </div>
              </div>
            )}

            {/* Virtual Keyboard */}
            <div className="space-y-2">
              {keyboard.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center">
                  {row.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeyClick(key)}
                      className={`${getKeyStyle(key)} ${
                        key === 'ENTER' || key === '⌫' ? 'px-4' : ''
                      }`}
                      disabled={gameStatus !== 'playing'}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="text-center mt-4 text-sm text-gray-600">
              Use your keyboard or click the letters above to play!
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wordle;
