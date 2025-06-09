export class TrieNode {
  children: (TrieNode | undefined)[] = new Array(128)
  nonAsciiChildren: Map<string, TrieNode> = new Map()
  value: any = null
  isEnd: boolean = false

  insert(word: string, value: any) {
    let node: TrieNode = this
    for (let i = 0; i < word.length; i++) {
      const char = word[i]
      const charCode = char.charCodeAt(0)

      let child: TrieNode | undefined
      if (charCode < 128) {
        child = node.children[charCode]
        if (!child) {
          child = new TrieNode()
          node.children[charCode] = child
        }
      } else {
        child = node.nonAsciiChildren.get(char)
        if (!child) {
          child = new TrieNode()
          node.nonAsciiChildren.set(char, child)
        }
      }
      node = child
    }
    node.isEnd = true
    node.value = value
    return this
  }

  findLongestMatch(input: string, startPos: number): { value: any; length: number } | null {
    let node: TrieNode = this
    let lastMatch: { value: any; length: number } | null = null
    let pos = startPos

    while (pos < input.length) {
      const char = input[pos]
      const charCode = char.charCodeAt(0)

      let child: TrieNode | undefined
      if (charCode < 128) {
        child = node.children[charCode]
      } else {
        child = node.nonAsciiChildren.get(char)
      }

      if (!child) break

      node = child
      pos++

      if (node.isEnd) {
        lastMatch = { value: node.value, length: pos - startPos }
      }
    }

    return lastMatch
  }
}
