<script setup lang="ts">
import { marked, } from 'marked';
import { useChat } from '@ai-sdk/vue';
import { useSpeechSynthesisCustom } from '~/composables/useSpeechSynthesis';

// Button stuff
type ButtonMode = 'hold' | 'pressToStart' | 'pressToStartStop'
const currentButtonMode = ref('hold' as ButtonMode)
const readyToSubmit = ref(false)

onMounted(() => {
  window.addEventListener('keydown', onButtonDown)
  window.addEventListener('keyup', onButtonUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onButtonDown)
  window.removeEventListener('keyup', onButtonUp)
})

function onButtonDown(e: KeyboardEvent) {
  if(e.key === ' ' && !e.repeat){
    switch (currentButtonMode.value) {
      case 'hold':
        console.log('Start listening')
        readyToSubmit.value = false
        startListening();
        break
      case 'pressToStart':
        console.log('Start listening')
        readyToSubmit.value = false
        startListening();
        break
      case 'pressToStartStop':
        if(!isListening.value) {
          console.log('Start listening')
          startListening();
        }
        else {
          console.log('Stop listening')
          stopListening()
        }
        break
    }
  }
}

function onButtonUp(e: KeyboardEvent) {
  if(e.key === ' '){
    switch (currentButtonMode.value) {
      case 'hold':
        console.log('Stop listening')
        readyToSubmit.value = true
        stopListening()
        break
      case 'pressToStart':
        break
      case 'pressToStartStop':
        break
    }
    
  }
}

const buttonListItems = ref([
  {
    value: 'hold',
    label: 'Hold',
    description: 'Hold > speak > release.'
  },
  {
    value: 'pressToStart',
    label: 'Press, single sentence',
    description: 'Press > speak a single sentence'
  },
  {
    value: 'pressToStartStop',
    label: 'Press, continuous ',
    description: 'Press > speak > press again to stop'
  }
])

const { isListening, start: startListening, stop: stopListening, result: ListeningResult, isFinal: ListeningResultIsFinal, error: ListeningError, recognition } = useSpeechRecognition({
  lang: 'sv-SE',
  interimResults: true,
  continuous: true,
})

const currentSpeechSynthText = ref('Tjenare');
const { utterance, speak, resume, status: speechStatus, isPlaying: speechIsPlaying, stop: stopSpeech, error: speechError, isSupported } = useSpeechSynthesisCustom(currentSpeechSynthText, {
  lang: 'sv-SE',
  pitch: 1,
  rate: 1.5,
});

const { messages, input, handleSubmit, status: chatStatus, data: chatData } = useChat()
const parsedMessages = computed(() => {
  return messages.value.map((message) => {
    return {
      ...message,
      parsedContent: marked.parse(message.content, {
        async: false,
      })
    }
  })
})

watch(chatStatus, () => {
  if (chatStatus.value === 'ready' && messages.value.length !== 0) {
    currentSpeechSynthText.value = messages.value[messages.value.length - 1].content;
  }
});

watch(chatData, () => {
  console.log('data updated:', chatData.value);
})

const sentenceTransformer = sentenceStreamer();
const wordWriter = sentenceTransformer.writable.getWriter();
const sentenceReader = sentenceTransformer.readable.getReader();

// const segmenter = new Intl.Segmenter(['sv', 'en'], { granularity: 'sentence' });
// const strArr = Array.from(segmenter.segment('Hello! Whats your name? My name is Bob!'));
onMounted(() => {
  readNextSentencesLoop();
})

async function readNextSentencesLoop() {
  while (true) {
    console.log('gonna read next sentence');
    // code execution pauses here until data available or stream closed (or error)
    const { value: sentence, done } = await sentenceReader.read();
    console.log('read next sentence resolved', sentence, done);
    if (done) break;
    // speechQueue.value.push(sentence)
    currentSpeechSynthText.value = sentence;
    speak();
  }
}

watch(() => messages.value.at(-1), (lastMessageNewValue, lastMessagePrevValue) => {
  if (!isDefined(lastMessageNewValue) || !isDefined(lastMessagePrevValue)) return;
  if (lastMessageNewValue.role !== 'assistant') return;
  // console.log('assistant message updated. new:', lastMessageNewValue.content, ' prev:', lastMessagePrevValue.content);
  if (lastMessageNewValue.id === lastMessagePrevValue.id) {
    const addedChars = lastMessageNewValue.content.substring(lastMessagePrevValue.content.length);
    // console.log(addedChars);
    wordWriter.write(addedChars);

    // Add to sentence
    // const lastSentence = speechQueue.value.at(-1); 
    // speechQueue.value.at(-1) += addedChars;
  } else {
    //Start new sentence
    console.log('new sentence');
    wordWriter.write(lastMessageNewValue.content);
    // speechQueue.value.push(lastMessageNewValue.content);
  }

  // console.log(newMessages[newMessages.length - 1].parts);
  // console.log(prevMessages[newMessages.length - 1].parts);
})

const resultsAppended = ref('')

watch(ListeningResultIsFinal, () => {
  if (ListeningResultIsFinal.value) {
    resultsAppended.value += ListeningResult.value
    input.value = resultsAppended.value

    switch (currentButtonMode.value) {
      case 'hold':
        break
      case 'pressToStart':
        readyToSubmit.value = true
        stopListening();
        break
      case 'pressToStartStop':
        readyToSubmit.value = true
        break
    }

    if(readyToSubmit.value) {
      submit()
    }
    
  }
})

function submit() {
  console.log("Submit result:", input.value)
  resultsAppended.value = ''
  handleSubmit()
}

import type { CardProps } from '@nuxt/ui';
const cardUISettings: CardProps['ui'] = { body: 'p-3 sm:p-3', header: 'p-3 sm:p-3', root: 'backdrop-blur-lg ring-neutral-500/35' }
const debugPanelClasses = 'grid grid-cols-2 items-center mt-3 border-t border-(--ui-border) gap-x-2 *:even:font-bold *:odd:text-sm'

const messageContainer = useTemplateRef<HTMLDivElement>('messageContainer');

watch(() => parsedMessages.value[parsedMessages.value.length - 1], (msg) => {
  // console.log(messageContainer.value?.lastElementChild?.lastElementChild);
  messageContainer.value?.lastElementChild?.lastElementChild?.scrollIntoView({
    behavior: 'smooth',
  });
})

const darkMode = computed(() => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
})

</script>

<template>

  <div class="w-screen h-screen flex flex-col">
    
    <ColorModeSwitch />
    
    <div class="flex-grow flex flex-col items-center justify-center gap-3">
      <div class="flex flex-col items-center" style="color: red">
        <UIcon :name="isListening ? 'i-material-symbols-mic' : 'i-material-symbols-mic-off'" class="size-10" color="red"/>
        <p>{{  isListening ? 'Listening' : 'Not listening' }}</p>
      </div>
      <p>
        Note: this demo uses a screen. However, the intended use case is to demonstrate a scenario where no screen is present.
      </p>
    </div>
    
    <div
      class="flex items-center justify-center w-full gap-2 p-4 backdrop-blur-lg ring-1 ring-(--ui-border)"
      @submit.prevent="handleSubmit">
      Space bar / physical button:
      <div>
        <URadioGroup v-model="currentButtonMode" color="primary" orientation="horizontal" variant="card" :items="buttonListItems" />
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>

/* :global(body) {
  background-color: oklch(from var(--ui-bg) L C H / 0.8);
  background-image: v-bind(bgurl);
  background-blend-mode: soft-light;
  background-position: center;
  background-attachment: fixed;
}
*/
</style>