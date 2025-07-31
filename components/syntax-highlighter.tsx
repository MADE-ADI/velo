import React from 'react'

interface SyntaxHighlighterProps {
  code: string
  language: string
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language }) => {
  const getKeywords = (lang: string): string[] => {
    switch (lang.toLowerCase()) {
      case 'python':
      case 'py':
        return ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'lambda', 'and', 'or', 'not', 'is', 'in', 'True', 'False', 'None', 'pass', 'break', 'continue']
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'async', 'await', 'class', 'extends', 'import', 'export', 'default', 'from', 'as', 'new', 'this', 'super']
      default:
        return []
    }
  }

  const renderWord = (word: string, index: number, fullLine: string, lang: string): React.ReactNode => {
    const keywords = getKeywords(lang)
    
    // Check for comments
    if (word.startsWith('#') || word.startsWith('//')) {
      // Rest of line is comment
      const commentStart = fullLine.indexOf(word)
      const comment = fullLine.slice(commentStart)
      return (
        <span key={index} className="text-green-400 italic">
          {comment}
        </span>
      )
    }
    
    // Check for strings
    if ((word.startsWith('"') && word.endsWith('"')) || 
        (word.startsWith("'") && word.endsWith("'")) ||
        (word.startsWith('`') && word.endsWith('`'))) {
      return (
        <span key={index} className="text-orange-400">
          {word}
        </span>
      )
    }
    
    // Check for keywords
    if (keywords.includes(word)) {
      return (
        <span key={index} className="text-blue-400 font-bold">
          {word}
        </span>
      )
    }
    
    // Check for numbers
    if (/^\d+(\.\d+)?$/.test(word)) {
      return (
        <span key={index} className="text-green-300">
          {word}
        </span>
      )
    }
    
    // Check for functions (word followed by parentheses)
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(word) && fullLine.includes(word + '(')) {
      return (
        <span key={index} className="text-yellow-400">
          {word}
        </span>
      )
    }
    
    // Default text
    return (
      <span key={index} className="text-gray-100">
        {word}
      </span>
    )
  }

  const renderLine = (line: string, lineIndex: number): React.ReactNode => {
    if (line.trim() === '') {
      return <div key={lineIndex}>&nbsp;</div>
    }

    // Handle comments separately
    const commentChar = language === 'python' || language === 'py' ? '#' : '//'
    const commentIndex = line.indexOf(commentChar)
    
    if (commentIndex !== -1) {
      const beforeComment = line.slice(0, commentIndex)
      const comment = line.slice(commentIndex)
      
      return (
        <div key={lineIndex}>
          {beforeComment && renderLineContent(beforeComment, language)}
          <span className="text-green-400 italic">{comment}</span>
        </div>
      )
    }
    
    return (
      <div key={lineIndex}>
        {renderLineContent(line, language)}
      </div>
    )
  }

  const renderLineContent = (line: string, lang: string): React.ReactNode[] => {
    const keywords = getKeywords(lang)
    const parts: React.ReactNode[] = []
    let currentIndex = 0
    
    // Simple regex to split by words but keep delimiters
    const tokens = line.split(/(\s+|["'`][^"'`]*["'`]|\w+|\W)/g).filter(token => token)
    
    tokens.forEach((token, index) => {
      if (!token) return
      
      // Skip empty tokens
      if (token.trim() === '') {
        parts.push(token)
        return
      }
      
      // Check for strings (quoted content)
      if ((token.startsWith('"') && token.endsWith('"')) || 
          (token.startsWith("'") && token.endsWith("'")) ||
          (token.startsWith('`') && token.endsWith('`'))) {
        parts.push(
          <span key={`${currentIndex}-${index}`} className="text-orange-400">
            {token}
          </span>
        )
        return
      }
      
      // Check for keywords
      if (keywords.includes(token)) {
        parts.push(
          <span key={`${currentIndex}-${index}`} className="text-blue-400 font-bold">
            {token}
          </span>
        )
        return
      }
      
      // Check for numbers
      if (/^\d+(\.\d+)?$/.test(token)) {
        parts.push(
          <span key={`${currentIndex}-${index}`} className="text-green-300">
            {token}
          </span>
        )
        return
      }
      
      // Check for functions (word followed by parentheses in the line)
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
        const nextTokenIndex = tokens.findIndex((t, i) => i > index && t.trim() !== '')
        if (nextTokenIndex !== -1 && tokens[nextTokenIndex].startsWith('(')) {
          parts.push(
            <span key={`${currentIndex}-${index}`} className="text-yellow-400">
              {token}
            </span>
          )
          return
        }
      }
      
      // Default text
      parts.push(
        <span key={`${currentIndex}-${index}`} className="text-gray-100">
          {token}
        </span>
      )
    })
    
    return parts
  }

  const lines = code.split('\n')
  
  return (
    <pre className="text-sm text-gray-100 font-mono leading-relaxed">
      <code>
        {lines.map((line, index) => renderLine(line, index))}
      </code>
    </pre>
  )
}

export default SyntaxHighlighter