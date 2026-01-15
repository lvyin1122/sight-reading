import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      language: {
        label: 'Language',
      },
      header: {
        title: 'Sight-Reading Generator',
        subtitle: 'Create quick practice sheets and keep the ones you like.',
      },
      controls: {
        key: 'Key',
        timeSig: 'Time signature',
        bars: 'Bars',
        tempo: 'Tempo (BPM)',
        noteDensity: 'Note density',
        noteDensityValue: 'Note density value',
        lowestPitch: 'Lowest pitch',
        highestPitch: 'Highest pitch',
        pitchFormatHint: 'Format: C4, G#5, Bb3, etc.',
        generate: 'Generate',
      },
      score: {
        title: 'Score',
        hint: 'Generate a score to preview notation',
        tip: 'Tip: click the score to generate a new one.',
        bars: '{{count}} bars',
        tempo: '{{count}} BPM',
        density: '{{percent}}% density',
        regenerateTooltip: 'Click to generate another score',
      },
      playback: {
        previous: 'Previous',
        play: 'Play',
        playing: 'Playing…',
        save: 'Save',
      },
      library: {
        title: 'Library',
        hint: 'Most recent first (stored locally)',
        empty: 'No saved scores yet. Save ones you like.',
        apply: 'Apply',
        export: 'Export',
        delete: 'Delete',
      },
      actions: {
        addToHome: 'Add to Home',
        importScore: 'Import Score',
        buyCoffee: 'Buy me a coffee',
        close: 'Close',
      },
      alerts: {
        duplicate: 'Score already exists in collection.',
        importInvalid: 'Invalid score file. Please select a JSON file exported from this app.',
        importFailed: 'Failed to load score file. Please ensure it is valid JSON.',
        addToHomeIos: 'On iOS Safari: tap Share → Add to Home Screen.',
        addToHomeAndroid: 'In Chrome: Menu → Add to Home screen.',
        addToHomeOther: 'Open this app on your mobile browser to add it to your home screen.',
      },
      support: {
        title: 'Buy me a coffee',
        desc: 'Unlock more features and tools—thank you for your support!',
        hint: 'Scan the QR code below to support this project.',
        wechatID: 'WeChat ID',
        email: 'Email',
        emailValue: 'khiwhyzqd@outlook.com',
      },
      footer: {
        text: 'Copyright © {{year}} Sight-Reading Generator. All rights reserved.',
      },
    },
  },
  zh: {
    translation: {
      language: {
        label: '语言',
      },
      header: {
        title: '视奏练习生成器',
        subtitle: '快速生成练习谱例，保存你喜欢的版本。',
      },
      controls: {
        key: '调号',
        timeSig: '拍号',
        bars: '小节数',
        tempo: '速度 (BPM)',
        noteDensity: '音符密度',
        noteDensityValue: '音符密度数值',
        lowestPitch: '最低音',
        highestPitch: '最高音',
        pitchFormatHint: '格式：C4、G#5、Bb3 等',
        generate: '生成',
      },
      score: {
        title: '乐谱',
        hint: '生成乐谱后可预览谱面',
        tip: '点击乐谱快速生成新的练习。',
        bars: '{{count}} 小节',
        tempo: '{{count}} BPM',
        density: '{{percent}}% 密度',
        regenerateTooltip: '点击生成新的乐谱',
      },
      playback: {
        previous: '上一个',
        play: '播放',
        playing: '播放中…',
        save: '保存',
      },
      library: {
        title: '收藏夹',
        hint: '最新的在前（本地保存）',
        empty: '还没有保存的乐谱，保存你喜欢的版本吧。',
        apply: '应用',
        export: '导出',
        delete: '删除',
      },
      actions: {
        addToHome: '添加到主屏幕',
        importScore: '导入乐谱',
        buyCoffee: 'Buy me a coffee',
        close: '关闭',
      },
      alerts: {
        duplicate: '乐谱已在收藏中。',
        importInvalid: '乐谱文件无效，请选择从本应用导出的 JSON 文件。',
        importFailed: '导入失败，请确认文件为有效的 JSON 格式。',
        addToHomeIos: '在 iOS Safari：分享 → 添加到主屏幕。',
        addToHomeAndroid: '在 Chrome：菜单 → 添加到主屏幕。',
        addToHomeOther: '请在手机浏览器中打开本应用再添加到主屏幕。',
      },
      support: {
        title: 'Buy me a coffee',
        desc: '解锁更多后续功能，感谢你的支持！',
        hint: '扫描下方二维码支持这个项目。',
        wechatID: '微信号',
        email: '邮箱',
        emailValue: 'khiwhyzqd@outlook.com',
      },
      footer: {
        text: '版权所有 © {{year}} 视奏练习生成器。保留所有权利。',
      },
    },
  },
}

const supportedLngs = ['en', 'zh', 'ja', 'ko', 'fr', 'de'] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs,
    load: 'languageOnly',
    lowerCaseLng: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupQuerystring: 'lang',
    },
    returnEmptyString: false,
  })

export default i18n

