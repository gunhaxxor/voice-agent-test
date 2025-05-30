import { assert, describe, expect, test, vi } from "vitest";
import type { RecognitionService } from '../src/recognitionService/interface';
import { MockRecognitionService } from "../src/recognitionService/mockRecognitionService";
import { manuscript } from './testManuscript'

describe('MockSTTService', () => {
  test('can initialize', () => {
    const sttService = new MockRecognitionService();
    expect(sttService).toBeDefined();
  })
  test('can startListenAudio without error', () => {
    const sttService = new MockRecognitionService();
    sttService.startListenAudio();
  })
  test('can stopListenAudio without error', () => {
    const sttService = new MockRecognitionService();
    sttService.startListenAudio();
    sttService.stopListenAudio();
  })
  test('can addTextReceivedListener without error', () => {
    const sttService = new MockRecognitionService();
    sttService.onTextReceived(() => { });
  })
  test('receives events if event listener added and startListenAudio', async () => {
    const mocklistener = vi.fn();
    const sttService = new MockRecognitionService(['Hello!']);
    sttService.onTextReceived(mocklistener);
    sttService.startListenAudio();
    await vi.waitUntil(() => mocklistener.mock.calls.length > 0, { timeout: 3000 });
    assert(mocklistener.mock.lastCall?.at(0) === 'Hello!', 'expected last call to be "Hello!"');
  })
  test('doesnt receive event if stopListenAudio', async () => {
    const mocklistener = vi.fn();
    const sttService = new MockRecognitionService();
    sttService.startListenAudio();
    sttService.stopListenAudio()
    sttService.onTextReceived(mocklistener);
    await vi.waitUntil(() => mocklistener.mock.calls.length === 0, { timeout: 40 });
  })
  test('doesnt trigger listener if listener is removed', async () => {
    const mocklistener = vi.fn();
    const sttService = new MockRecognitionService();
    sttService.startListenAudio();
    sttService.onTextReceived(mocklistener);
    sttService.onTextReceived(undefined);
    await vi.waitUntil(() => mocklistener.mock.calls.length === 0, { timeout: 40 });
  })
})