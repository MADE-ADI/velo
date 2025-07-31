import React from 'react'
import SyntaxHighlighter from './syntax-highlighter'

interface MarkdownRendererProps {
  content: string
  className?: string
}

interface CodeBlock {
  language: string
  code: string
  startIndex: number
  endIndex: number
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Parse code blocks from markdown
  const parseCodeBlocks = (text: string): (string | CodeBlock)[] => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
    const parts: (string | CodeBlock)[] = []
    let lastIndex = 0
    let match

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index)
        if (beforeText.trim()) {
          parts.push(beforeText)
        }
      }

      // Add code block
      const language = match[1] || 'text'
      const code = match[2].trim()
      parts.push({
        language,
        code,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText.trim()) {
        parts.push(remainingText)
      }
    }

    // If no code blocks found, return original text
    if (parts.length === 0) {
      parts.push(text)
    }

    return parts
  }

  // Parse inline code
  const parseInlineCode = (text: string) => {
    const inlineCodeRegex = /`([^`]+)`/g
    return text.split(inlineCodeRegex).map((part, index) => {
      if (index % 2 === 1) {
        // This is inline code
        return (
          <code
            key={index}
            className="bg-gray-800 text-green-400 px-1 py-0.5 rounded text-sm font-mono"
          >
            {part}
          </code>
        )
      }
      return part
    })
  }

  const formatText = (text: string) => {
    // Handle line breaks
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {parseInlineCode(line)}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ))
  }

  const getLanguageIcon = (language: string) => {
    const icons: { [key: string]: string } = {
      python: '🐍',
      javascript: '🟨',
      typescript: '🔷',
      html: '🌐',
      css: '🎨',
      java: '☕',
      cpp: '⚡',
      c: '🔧',
      sql: '🗄️',
      bash: '💻',
      json: '📋',
      xml: '📄',
      yaml: '⚙️',
      dockerfile: '🐳',
      go: '🐹',
      rust: '🦀',
      php: '🐘',
      ruby: '💎',
      swift: '🍎',
      kotlin: '🅺',
      dart: '🎯'
    }
    return icons[language.toLowerCase()] || '📝'
  }

  const [copiedText, setCopiedText] = React.useState<string | null>(null)

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedText(code)
      // Auto-hide notification after 2 seconds
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedText(code)
        setTimeout(() => setCopiedText(null), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const parts = parseCodeBlocks(content)

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          // Regular text
          return (
            <div key={index} className="mb-2">
              {formatText(part)}
            </div>
          )
        } else {
          // Code block
          return (
            <div key={index} className="mb-4">
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                {/* Code block header */}
                <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getLanguageIcon(part.language)}</span>
                    <span className="text-sm font-medium text-gray-300 capitalize">
                      {part.language}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(part.code)}
                    className={`transition-colors text-sm flex items-center space-x-1 px-2 py-1 rounded ${
                      copiedText === part.code 
                        ? 'text-green-400 bg-green-900/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    title={copiedText === part.code ? "Copied!" : "Copy code"}
                  >
                    {copiedText === part.code ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span>{copiedText === part.code ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                
                {/* Code content with syntax highlighting */}
                <div className="p-4 overflow-x-auto">
                  <SyntaxHighlighter 
                    code={part.code} 
                    language={part.language}
                  />
                </div>
              </div>
            </div>
          )
        }
      })}
    </div>
  )
}

export default MarkdownRenderer