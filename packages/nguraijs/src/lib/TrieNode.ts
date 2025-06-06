export class TrieNode {
  children: Map<string, TrieNode> = new Map()
  value: any = null
  isEnd: boolean = false

  insert(word: string, value: any) {
    let node: TrieNode = this
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)!
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
      const child = node.children.get(char)

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
