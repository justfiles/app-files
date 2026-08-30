import { FileTree, type FileTreeDirectoryHandle, type FileTreeItemHandle } from '@pierre/trees'
import { expect, test } from 'vitest'
import { diffChildren, type TreeEntry, treePath } from './tree.ts'

const file = (name: string, ino = name): TreeEntry => ({ ino, name, type: 0 })
const directory = (name: string, ino = name): TreeEntry => ({ ino, name, type: 1 })

function isDirectory(item: FileTreeItemHandle | null): item is FileTreeDirectoryHandle {
	return item?.isDirectory() === true
}

test('treePath keeps directories explicit', () => {
	expect(treePath('/', directory('notes'))).toBe('notes/')
	expect(treePath('/notes', file('today.md'))).toBe('notes/today.md')
})

test('diffChildren batches direct additions and recursive directory removals', () => {
	expect(
		diffChildren('/notes', [directory('old'), file('keep.md')], [file('keep.md'), file('new.md')])
	).toEqual([
		{ type: 'remove', path: 'notes/old/', recursive: true },
		{ type: 'add', path: 'notes/new.md' }
	])
})

test('diffChildren recognizes a file rename by inode', () => {
	expect(diffChildren('/notes', [file('before.md', '7')], [file('after.md', '7')])).toEqual([
		{ type: 'move', from: 'notes/before.md', to: 'notes/after.md' }
	])
})

test('diffChildren does not treat a directory rename as loaded', () => {
	expect(diffChildren('/', [directory('before', '7')], [directory('after', '7')])).toEqual([
		{ type: 'remove', path: 'before/', recursive: true },
		{ type: 'add', path: 'after/' }
	])
})

test('Pierre reports expansion for an explicit directory with no loaded children', () => {
	const model = new FileTree({ paths: ['notes/'], initialExpansion: 'closed' })
	let changes = 0
	const unsubscribe = model.subscribe(() => changes++)

	const notes = model.getItem('notes/')
	expect(isDirectory(notes)).toBe(true)
	if (!isDirectory(notes)) throw new Error('notes must be a directory')
	notes.expand()

	expect(notes.isExpanded()).toBe(true)
	expect(changes).toBe(1)
	unsubscribe()
	model.cleanUp()
})
