    // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
    // --- SillyTavern Global API ---
    // These are provided by the SillyTavern environment at runtime.
      // We will check for their existence before using them.
      /* global TavernHelper, eventOn, tavern_events, getChatMessages, getCurrentMessageId, _ */

      // --- Main Application Logic ---
      (function () {

    // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
    const AppStorage = (() => {
    const STORAGE_NAMESPACE = 'GUIXU_GACHA_';
    const getNamespacedKey = (key) => `${STORAGE_NAMESPACE}${key}`;
    const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === 'undefined') return null;
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return;
                seen.add(value);
            }
            return value;
        };
    };
    const saveData = (key, value) => {
        if (typeof key !== 'string') return;
        try {
            const namespacedKey = getNamespacedKey(key);
            const stringifiedValue = JSON.stringify(value, getCircularReplacer());
            localStorage.setItem(namespacedKey, stringifiedValue);
        } catch (error) {
            console.error(`AppStorage Error: Failed to save data for key \"${key}\".`, error);
        }
    };
    const loadData = (key, defaultValue = null) => {
        if (typeof key !== 'string') return defaultValue;
        try {
            const namespacedKey = getNamespacedKey(key);
            const stringifiedValue = localStorage.getItem(namespacedKey);
            if (stringifiedValue === null) return defaultValue;
            return JSON.parse(stringifiedValue);
        } catch (error) {
            console.error(`AppStorage Error: Failed to load data for key \"${key}\".`, error);
            return defaultValue;
        }
    };
    return { saveData, loadData };
})();
        'use strict';

        // --- API Availability Check ---
        if (
          typeof TavernHelper === 'undefined' ||
          typeof eventOn === 'undefined' ||
          typeof tavern_events === 'undefined' ||
          typeof getChatMessages === 'undefined' ||
          typeof getCurrentMessageId === 'undefined'
        ) {
          console.error('TavernHelper API, event system, or lodash not found.');
          document.addEventListener('DOMContentLoaded', () => {
            document.body.innerHTML =
              '<h1 style="color: red; text-align: center;">错误：SillyTavern 环境 API 未找到或版本不兼容</h1><p style="color:grey; text-align:center;">请确保已安装并启用 TavernHelper 扩展。</p>';
          });
          return;
        }

        // --- Core Application Object for UI Interactions ---
        // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
        const GuixuManager = {
          isInitialized: false, // 初始化状态标志

          destroy() {
            // 清理逻辑将在这里逐步添加
            console.log('[归墟] GuixuManager.destroy() 被调用');

            // 1. 移除键盘快捷键监听器
            if (this.boundHandleKeydown) {
              document.removeEventListener('keydown', this.boundHandleKeydown);
              this.boundHandleKeydown = null;
            }

            // 2. 清除自动保存定时器
            if (this.autoSaveInterval) {
              clearInterval(this.autoSaveInterval);
              this.autoSaveInterval = null;
            }

            // 3. 移除动态添加的DOM元素
            const rootContainer = document.querySelector('.guixu-root-container');
            if (rootContainer) {
              rootContainer.remove();
            }
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());

            // 4. 重置所有状态
            this.isInitialized = false;
            this.currentMvuState = null;
            this.db = null;
            this.dbPromise = null;
            this.equippedItems = {};
            this.pendingActions = [];
            this.guixuStoreItems = [];
            this.baseAttributes = {};
            this.calculatedMaxAttributes = {};
            this.lastExtractedJourney = null;
            this.lastExtractedPastLives = null;
            this.gachaState = {};
            this.gachaCollection = {};
            this.gachaHistory = [];
            this.gachaPools = { character: { ssr: [], sr: [], r: [] }, item: { ssr: [], sr: [], r: [] }, talent: { ssr: [], sr: [], r: [] } };
            // ... and so on for all other properties
          },
 
          // --- 新增：衍梦尘 Gacha系统状态变量 ---
          isFromGuixuSystem: false,
    currentGachaPoolType: 'character', // 新增：跟踪当前显示的卡池类型
      gachaState: {
              mengChen: 1600, // 初始赠送
              pitySSR_char: 0,
              pitySR_char: 0,
              pitySSR_item: 0,
              pitySR_item: 0,
              pitySSR_talent: 0,
              pitySR_talent: 0,
              redeemedCodes: [],
                  activeCompanions: [],
          },
          gachaCollection: {},
          gachaHistory: [],
          gachaPools: { // 修改为三卡池结构
              character: { ssr: [], sr: [], r: [] },
              item:      { ssr: [], sr: [], r: [] },
              talent:    { ssr: [], sr: [], r: [] }
          },
   
          isGachaCheatMode: false, // 新增：作弊模式开关   
          pendingCompanionJoin: null, // 新增：等待加入世界的伙伴信息
          pendingCharacterCardGeneration: null, // 新增：等待AI生成角色卡的任务
   listenersBound: false, // 新增：防止事件监听器重复绑定的标志
          isSegmentedMemoryAutoOn: false, // 新增：分段记忆自动生成开关
          segmentedMemoryPollTimer: null, // 新增：分段记忆轮询定时器ID
          isSmallSummaryAutoOn: false, // 新增：小总结自动生成开关
          smallSummaryPollTimer: null, // 新增：小总结轮询定时器ID
          isLargeSummaryAutoOn: false, // 新增：大总结自动生成开关
          largeSummaryPollTimer: null, // 新增：大总结轮询定时器ID
          // 新增：跟踪是否从设置界面进入子窗口
          isFromSettingsModal: false,
          worldEventsViewMode: 'timeline', // 新增：世界大事视图模式,

          // 新增：主界面透明度设置
          mainOpacity: 100, // 默认100%不透明
          intimateCharacters: new Set(), // 新增：用于存储亲密角色的Set
          
          // 新增：面板折叠状态
          leftPanelCollapsed: false,

          // --- IndexedDB 数据库实例缓存 ---
          db: null,
          dbPromise: null,
          rightPanelCollapsed: false,
          
          // 追踪已装备物品的状态
          // **逻辑修正**: equippedItems 现在存储完整的物品对象，而不仅仅是ID
          equippedItems: {
            wuqi: null,
            fangju: null,
            shipin: null,
            fabao1: null,
            zhuxiuGongfa: null,
            fuxiuXinfa: null,
          },
          currentMvuState: null, // 新增：用于缓存当前最新的mvu状态
          pendingActions: [], // 购物车/指令队列
          guixuStoreItems: [], // 归墟空间商品缓存
          baseAttributes: {}, // 存储从mvu加载的原始属性
          calculatedMaxAttributes: {}, // 新增：用于缓存计算后的属性上限
          lastExtractedJourney: null,
          lastExtractedPastLives: null,
          lastExtractedNovelText: null, // 新增：用于存储提取的原始正文
          lastExtractedCharacterCard: null, // 新增：用于存储提取的角色卡
          lastExtractedMapCommands: null, // 新增：用于存储提取的地图指令
          lastExtractedThinking: null, // 新增：用于存储提取的思维过程
          lastExtractedVariables: null, // 新增：用于存储变量改变
          lastSentPrompt: null, // 新增：用于存储发送给AI的完整提示
          isNovelModeEnabled: false, // 新增：小说模式开关状态
          isAutoWriteEnabled: true, // 默认开启自动写入
          autoWriteIntervalId: null, // 用于存储轮询计时器ID
          
          // 新增：世界书预设管理状态
          worldbookPresets: {}, // 存储所有预设
          currentEditingPreset: null, // 当前正在编辑的预设
          presetManagerState: {
            selectedPresetId: null,
            isEditing: false
          },
          isFromWorldbookManager: false, // 新增：跟踪是否从世界书管理界面进入预设管理
          novelModeAutoWriteIntervalId: null, // 新增：小说模式的自动写入轮询ID
          isMobileView: false, // 新增：追踪移动视图状态
          isCharacterPanelVisible: false, // 新增：追踪角色面板的显示状态
          relationshipSortType: 'default', // 新增: 人物关系排序类型
          isInteractionPanelVisible: false, // 新增：追踪交互面板的显示状态
          unifiedIndex: 1, // 新增：统一的读写序号
          novelModeIndex: 1, // 保留：用于向后兼容，但小说模式现在使用unifiedIndex
          isAutoToggleLorebookEnabled: false, // 新增：自动开关世界书状态
          autoToggleIntervalId: null, // 新增：轮询计时器ID
          isAutoSaveEnabled: false, // 新增：自动存档开关状态
          isActionOptionsEnabled: true, // 新增：行动选项开关状态
          isActionAutoSend: true, // 新增：行动选项自动发送开关状态
          mapUpdateIntervalId: null, // 新增: 地图自动更新轮询ID
          isAutoTrimEnabled: false, // 新增：自动修剪开关状态
          isStreamingGametxt: false, // 新增：跟踪<gametxt>流式状态
          isStreamingEnabled: true, // 新增：流式开关状态
          isFormatValidationEnabled: true, // 新增：格式审查开关状态
          isEnterSendEnabled: false, // 新增：回车发送开关状态
          isKeyboardShortcutsEnabled: true, // 新增：键盘快捷键开关状态
          isMobileInputAdaptEnabled: false, // 新增：手机输入框适配开关状态
          lastValidGametxtHTML: '', // 新增：用于备份上一次有效的正文HTML
          intimateCharacters: [], // 新增：亲密关系角色ID列表
          floatingInputContainer: null, // 新增：浮动输入框容器
          
          // --- 新增：文字设置状态 ---
          textSettings: {
            colors: {
              normal: '#e8dcc6',        // 正文颜色
              dialogue: '#ff1493',      // 对话颜色
              psychology: '#808080',    // 心理活动颜色：灰色
              scenery: '#98fb98'       // 景物描写颜色
            },
            fontSize: 14,              // 全局字体大小
            fontSizes: {               // 单独字体大小设置
              normal: 14,             // 正文字体大小
              dialogue: 14,           // 对话字体大小
              psychology: 13,         // 心理活动字体大小
              scenery: 15             // 景物描写字体大小
            },
            fontFamily: "'ZCOOL+KuaiLe', 'Ma+Shan+Zheng', serif", // 字体族
            customFonts: []            // 用户上传的自定义字体
          },
          
          // --- 新增：背景图管理状态 ---
          backgroundImages: [], // 存储用户上传的背景图
          backgroundMode: 'random', // 'random' 或 'fixed'
          selectedBackgroundId: null, // 固定模式下选中的背景图ID
          // --- 新增：地图缩放/平移状态 ---
          mapState: {
               scale: 1,
               panX: 0,
               panY: 0,
               isPanning: false,
               startX: 0,
               startY: 0,
               animationFrameId: null, // 用于优化拖动性能
               playerMapPos: null, // 新增：用于存储玩家在地图上的像素坐标
           },
          // --- 新增：处理所有动作的核心函数 ---
          waitingMessages: [
            '呜呜呜呜伟大的梦星大人啊，请给你虔诚的信徒{{user}}回复吧......',
            '梦星大人，我们敬爱你口牙！！请给我回复吧！！',
            '梦星大人正在回应你的请求，七个工作日给你回复',
            '正在向伟大梦星祈祷......呜呜呜你快一点好不好'
          ],

          showWaitingMessage() {
            this.hideWaitingMessage(); // Ensure only one is visible
            const message = this.waitingMessages[Math.floor(Math.random() * this.waitingMessages.length)];
            const msgElement = document.createElement('div');
            msgElement.id = 'waiting-popup';
            msgElement.className = 'waiting-popup';
            // 更新HTML结构以包含spinner
            msgElement.innerHTML = `
              <div class="waiting-spinner"></div>
              <span>${message}</span>
            `;
            const container = document.querySelector('.guixu-root-container');
            if (container) {
                container.appendChild(msgElement);
            }
          },

          hideWaitingMessage() {
              const existingMsg = document.getElementById('waiting-popup');
              if (existingMsg) {
                  existingMsg.remove();
              }
          },

          updateWaitingMessage(text) {
             const popup = document.getElementById('waiting-popup');
             if (popup) {
                 const span = popup.querySelector('span');
                 if (span) {
                     span.textContent = text;
                 }
             }
          },

          // --- 新增：视图切换核心功能 ---
          toggleViewMode() {
            this.isMobileView = !this.isMobileView;
            const container = document.querySelector('.guixu-root-container');
            const btn = document.getElementById('view-toggle-btn');
            if (container && btn) {
              if (this.isMobileView) {
                container.classList.add('mobile-view');
                btn.textContent = '💻'; // 切换到桌面图标
                btn.title = '切换到桌面视图';
              } else {
                container.classList.remove('mobile-view');
                btn.textContent = '📱'; // 切换到手机图标
                btn.title = '切换到移动视图';
              }
            }
            this.saveViewMode();
          },

          saveViewMode() {
            try {
              localStorage.setItem('guixu_view_mode', this.isMobileView ? 'mobile' : 'desktop');
            } catch (e) {
              console.error('保存视图模式失败:', e);
            }
          },

          loadViewMode() {
            try {
              const savedMode = localStorage.getItem('guixu_view_mode');
              // 仅当保存的模式为 'mobile' 时，才在加载时切换到移动视图
              if (savedMode === 'mobile') {
                this.isMobileView = true; // 设置初始状态
                const container = document.querySelector('.guixu-root-container');
                const btn = document.getElementById('view-toggle-btn');
                if (container && btn) {
                  container.classList.add('mobile-view');
                  btn.textContent = '💻';
                  btn.title = '切换到桌面视图';
                }
              } else {
                this.isMobileView = false; // 确保默认是桌面视图
              }
            } catch (e) {
              console.error('加载视图模式失败:', e);
            }
          },

          formatMessageContent(text) {
            if (!text) return '';

            // 预处理：仅处理章节标题和换行
            let processedText = text.replace(/\\n/g, '<br />');
            processedText = processedText.replace(/(^\s*第.*?章.*$)/gm, (match) => `<h3 class="novel-chapter-title">${match}</h3>`);

            // --- 最终方案：基于AST的解析器 ---
            const parseAndStyle = (str) => {
                // 1. 分词 (Tokenization)
                // 将字符串分解为标记符号和纯文本块
                const tokens = str.match(/(\*\*|\*|【【|】】|【|】|《|》|「|」|『|』|“|”|"[^"]*"|'[^']*')|([^【】\*《》「」『』“”'"]+)/g) || [];

                // 2. 定义规则
                const tokenRules = {
                    '**': { type: 'psychology', symmetric: true },
                    '*': { type: 'psychology', symmetric: true },
                    '【【': { type: 'scenery', open: '【【', close: '】】' },
                    '】】': { type: 'scenery', open: '【【', close: '】】' },
                    '【': { type: 'scenery', open: '【', close: '】' },
                    '】': { type: 'scenery', open: '【', close: '】' },
                    '《': { type: 'language', open: '《', close: '》' },
                    '》': { type: 'language', open: '《', close: '》' },
                    '「': { type: 'language', open: '「', close: '」' },
                    '」': { type: 'language', open: '「', close: '」' },
                    '『': { type: 'language', open: '『', close: '』' },
                    '』': { type: 'language', open: '『', close: '』' },
                    '“': { type: 'language', open: '“', close: '”' },
                    '”': { type: 'language', open: '“', close: '”' },
                    '"': { type: 'language', symmetric: true },
                    "'": { type: 'language', symmetric: true }
                };
                const classMap = { psychology: 'text-psychology', scenery: 'text-scenery', language: 'text-language' };

                // 3. 解析 (Parsing) -> 构建抽象语法树 (AST)
                let root = { type: 'root', children: [] };
                let stack = [root]; // 节点栈

                for (const token of tokens) {
                    const rule = tokenRules[token];
                    let currentNode = stack[stack.length - 1];

                    if (rule) {
                        if (rule.symmetric) {
                            if (currentNode.type === rule.type && currentNode.token === token) {
                                stack.pop(); // 闭合对称标签
                            } else {
                                const newNode = { type: rule.type, token: token, children: [] };
                                currentNode.children.push(newNode);
                                stack.push(newNode); // 开启对称标签
                            }
                        } else if (token === rule.open) { // 开启非对称标签
                            const newNode = { type: rule.type, children: [] };
                            currentNode.children.push(newNode);
                            stack.push(newNode);
                        } else if (token === rule.close) { // 闭合非对称标签
                            if (currentNode.type === rule.type) {
                                stack.pop();
                            } else { // 容错：如果标签不匹配，则作为纯文本处理
                                currentNode.children.push(token);
                            }
                        }
                    } else { // 纯文本
                        currentNode.children.push(token);
                    }
                }

                // 4. 代码生成 (Code Generation)
                const generateHTML = (node) => {
                    if (typeof node === 'string') {
                        // 在最终生成时才进行HTML实体转义
                        return node.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                    }
                    const childrenHTML = node.children.map(generateHTML).join('');
                    if (node.type === 'root') {
                        return childrenHTML;
                    }
                    // 在这里，我们将标记符号本身也包含在span内部，以实现对符号的染色
                    const openToken = node.token || Object.keys(tokenRules).find(k => tokenRules[k].type === node.type && tokenRules[k].open === k) || '';
                    const closeToken = node.token || Object.keys(tokenRules).find(k => tokenRules[k].type === node.type && tokenRules[k].close === k) || '';
                    
                    return `<span class="${classMap[node.type]}">${openToken}${childrenHTML}${closeToken}</span>`;
                };
                
                // 修正：在生成HTML时，我们应该只包裹内容，而不是再次添加标记
                const generateCorrectHTML = (node) => {
                     if (typeof node === 'string') {
                        return node.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                    }
                    const childrenHTML = node.children.map(generateCorrectHTML).join('');
                    if (node.type === 'root') {
                        return childrenHTML;
                    }
                    // 只包裹内容
                    return `<span class="${classMap[node.type]}">${childrenHTML}</span>`;
                }

                // 我们需要修改解析逻辑，将标记符号作为AST的一部分
                // ... 让我们简化一下，直接在生成时添加它们

                const generateFinalHTML = (node, parent) => {
                    if (typeof node === 'string') {
                         return node.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                    }
                    const childrenHTML = node.children.map(child => generateFinalHTML(child, node)).join('');
                    if (node.type === 'root') return childrenHTML;

                    const open = node.token || Object.keys(tokenRules).find(k => tokenRules[k].type === node.type && tokenRules[k].open) || '';
                    const close = node.token || Object.keys(tokenRules).find(k => tokenRules[k].type === node.type && tokenRules[k].close) || '';

                    return `<span class="${classMap[node.type]}">${open}${childrenHTML}${close}</span>`;
                };
                
                // 最终版生成器
                const finalGenerator = (node) => {
                    if (typeof node === 'string') {
                        return node.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                    }
                    
                    const childrenHtml = node.children.map(finalGenerator).join('');
                    
                    if (node.type === 'root') {
                        return childrenHtml;
                    }
                    
                    return `<span class="${classMap[node.type]}">${childrenHtml}</span>`;
                };

                // 重新思考解析逻辑，将标记也作为节点
                let new_root = { type: 'root', children: [] };
                let new_stack = [new_root];

                for (const token of tokens) {
                    const rule = tokenRules[token];
                    let currentNode = new_stack[new_stack.length - 1];

                    if (rule) {
                        if (rule.symmetric) {
                            if (currentNode.type === rule.type && currentNode.token === token) {
                                new_stack.pop();
                            } else {
                                const newNode = { type: rule.type, token: token, children: [] };
                                currentNode.children.push(newNode);
                                new_stack.push(newNode);
                            }
                        } else if (rule.open === token) {
                            const newNode = { type: rule.type, open: token, close: rule.close, children: [] };
                            currentNode.children.push(newNode);
                            new_stack.push(newNode);
                        } else if (rule.close === token) {
                            if (currentNode.type === rule.type && currentNode.close === token) {
                                new_stack.pop();
                            } else {
                                currentNode.children.push(token); // Mismatch, treat as text
                            }
                        }
                    } else {
                        currentNode.children.push(token);
                    }
                }
                
                const finalHtmlGenerator = (node) => {
                    if (typeof node === 'string') {
                        return node.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                    }
                    const childrenHtml = node.children.map(finalHtmlGenerator).join('');
                    if (node.type === 'root') {
                        return childrenHtml;
                    }

                    // 根据类型决定是否保留标记符号
                    if (node.type === 'language') {
                        // 对话类型，保留符号
                        return `<span class="${classMap[node.type]}">${node.open || node.token || ''}${childrenHtml}${node.close || node.token || ''}</span>`;
                    } else {
                        // 景物和心理类型，移除符号
                        return `<span class="${classMap[node.type]}">${childrenHtml}</span>`;
                    }
                };

                return finalHtmlGenerator(new_root);
            };

            return parseAndStyle(processedText);
          },

          // --- 新增：实时更新正文字数 ---
          updateLiveWordCount() {
            const gameTextDisplay = document.getElementById('game-text-display');
            const wordCountEl = document.getElementById('game-text-word-count');
            if (gameTextDisplay && wordCountEl) {
              // 使用 textContent 来获取纯文本，自动忽略HTML标签
              const wordCount = gameTextDisplay.textContent ? gameTextDisplay.textContent.trim().length : 0;
              wordCountEl.textContent = `正文：${wordCount}字`;
            }
          },

          async init() {
            if (this.isInitialized) {
              console.log('[归墟] GuixuManager 已初始化，跳过重复操作。');
              return;
            }
            console.log('[归墟] 正在初始化 GuixuManager...');
            this.isInitialized = true;

            // --- 新增：动态注入归墟空间定制化CSS ---
            const customStyles = `
                /* 归墟空间确认框定制样式 */
                #custom-confirm-modal.guixu-confirm-modal .modal-content {
                    background: var(--bg-secondary, rgba(15, 15, 35, 0.85));
                    border: 1px solid var(--border-color, #444);
                    border-radius: 8px;
                    box-shadow: var(--shadow-glow, 0 0 12px rgba(201, 170, 113, 0.3)), var(--shadow-elevation-medium, 0 4px 6px rgba(0, 0, 0, 0.2));
                    width: 400px !important; /* 调整宽度并强制覆盖 */
                    max-width: 80vw;
                    height: auto;
                    min-height: 180px; /* 调整最小高度 */
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center; /* 垂直居中 */
                    align-items: center; /* 水平居中 */
                    gap: 20px; /* 元素间距 */
                }
                #custom-confirm-modal.guixu-confirm-modal .modal-header {
                    padding: 0;
                    border-bottom: none;
                    position: absolute; /* 将关闭按钮定位到右上角 */
                    top: 10px;
                    right: 10px;
                }
                #custom-confirm-modal.guixu-confirm-modal .modal-title {
                    display: none; /* 隐藏默认标题 */
                }
                #custom-confirm-modal.guixu-confirm-modal .confirm-modal-message {
                    color: var(--text-primary, #e0e0e0);
                    font-size: 16px;
                    text-align: center;
                    line-height: 1.6;
                }
                #custom-confirm-modal.guixu-confirm-modal .confirm-modal-buttons {
                    display: flex;
                    gap: 15px;
                    padding: 0;
                }
                #custom-confirm-modal.guixu-confirm-modal .interaction-btn {
                    min-width: 100px;
                }
                #custom-confirm-modal.guixu-confirm-modal #custom-confirm-btn-ok {
                    background-color: var(--primary-gold, #c9aa71);
                    color: var(--text-on-primary, #1a1a1a);
                    border: none;
                }
                #custom-confirm-modal.guixu-confirm-modal #custom-confirm-btn-ok:hover {
                    background-color: var(--secondary-gold, #daa520);
                }
                #custom-confirm-modal.guixu-confirm-modal #custom-confirm-btn-cancel {
                    background-color: transparent;
                    border: 1px solid var(--border-color-light, #666);
                    color: var(--text-secondary, #b0b0b0);
                }
                #custom-confirm-modal.guixu-confirm-modal #custom-confirm-btn-cancel:hover {
                    background-color: var(--bg-hover, rgba(255, 255, 255, 0.1));
                    border-color: var(--border-color-hover, #888);
                }
            `;
            const styleElement = document.createElement('style');
            styleElement.textContent = customStyles;
            document.head.appendChild(styleElement);

            console.log('归墟UI交互管理器初始化...');
            this.bindStaticListeners();
            this.loadWindowSizeState(); // 加载窗口大小状态
            this.loadModalSizeState(); // 加载模态框大小状态
            this.initBackgroundSystem(); // 初始化背景图系统
            this.loadWorldbookPresets(); // 加载世界书预设
            await this.updateDynamicData(); // Initial data load
            this.loadAutoWriteState(); // 加载自动写入状态
            this.loadNovelModeState(); // 加载小说模式状态
            this.loadEquipmentState(); // 加载已装备物品状态
            this.loadPendingActions(); // 加载待处理指令
            this.loadViewMode(); // 新增：加载用户保存的视图模式
            this.loadUnifiedIndex(); // 新增：加载统一的读写序号
            // 移除：this.loadNovelModeIndex(); // 小说模式现在使用统一序号
            this.loadAutoToggleState(); // 新增：加载自动开关状态
            this.loadWorldbookSettings(); // 新增：加载世界书高级设置
            this.loadAutoSaveState(); // 新增：加载自动存档状态
            this.loadSegmentedMemoryState(); // 加载统一的开关状态
            this.loadSegmentedMemoryCounts(); // 新增：加载分段记忆保留数
            // 小总结和大总结的状态将由主开关控制，但仍需加载以确保旧设置的兼容性
            this.loadSmallSummaryState();
            this.loadLargeSummaryState();
            this.loadActionOptionsState(); // 新增：加载行动选项开关状态
            this.loadActionAutoSendState(); // 新增：加载行动选项自动发送状态
            this.startMapUpdatePolling(); // 新增: 启动地图轮询
            this.loadAutoTrimState(); // 新增：加载自动修剪状态
            this.loadPanelStates(); // 新增：加载面板折叠状态
            this.loadStreamingState(); // 新增：加载流式开关状态
            this.loadFormatValidationState(); // 新增：加载格式审查状态
            this.loadEnterSendState(); // 新增：加载回车发送状态
            this.loadKeyboardShortcutsState(); // 新增：加载键盘快捷键状态
            this.loadMobileInputAdaptState(); // 新增：加载手机输入框适配状态
            this.loadIntimateList(); // 新增：加载亲密关系列表
            this.loadRelationshipSettings(); // 新增：加载人物关系设置
            this.loadLastThinking(); // 新增：加载上次的思维过程
            this.loadTrimFieldsState(); // 新增：加载修剪字段状态
            this.loadTextSettings(); // 新增：加载文字设置
   
            this.loadGachaState(); // 新增：加载Gacha数据
  
            this.loadGachaCheatState(); // 新增：加载Gacha作弊模式状态
          await this.loadCharacterPoolFromLorebook(); // 新增：加载卡池
         this.updateThinkingButtonVisibility(); // 新增：根据加载的数据更新按钮
            
            // 在所有状态加载完成后，初始化键盘处理
            setTimeout(() => {
                this.setupInputKeyboardHandling();
                console.log('[归墟输入法] 延迟初始化完成，当前适配开关状态:', this.isMobileInputAdaptEnabled);
            }, 100);

               // 已移除 MESSAGE_SWIPED 事件监听器，以避免与核心mvu脚本冲突。
            // UI刷新现在通过 handleAction 内部的主动调用来完成。
           eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text) => this.handleStreamUpdate(text));
           eventOn(iframe_events.GENERATION_ENDED, (text) => this.handleStreamEnd(text));
          },

          // --- 新增：流式处理函数 ---
          handleStreamUpdate(text) {
            if (!this.isStreamingGametxt && text.includes('<gametxt>')) {
                this.isStreamingGametxt = true;
                this.updateWaitingMessage('梦星大人正在给你流式生成正文，赞美梦星大人！！！');
                // 隐藏变量改变提醒（复用行动选项的逻辑）
                this.hideVariableChangesReminder();
            }
            const gameTextDisplay = document.getElementById('game-text-display');
            if (gameTextDisplay) {
              const displayText = this._getDisplayText(text);
              gameTextDisplay.innerHTML = this.formatMessageContent(displayText);
              this.updateLiveWordCount(); // 修复：调用统一的字数统计函数
            }
          },

          // --- 新增：完善的格式验证函数 ---
          validateResponseFormat(text) {
            // 定义标签检查配置
            const tagConfig = {
              // 必需标签：必须存在且正确闭合
              required: ['gametxt', '本世历程'],
              // 可选标签：如果存在则必须正确闭合
              optional: ['UpdateVariable', 'thinking', 'action']
            };
            
            const errors = [];

            // 智能过滤掉<thinking>...</thinking>标签内容，避免其中的内容干扰格式验证
            const thinkingRegex = /<thinking>[\s\S]*?<\/thinking>/gi;
            let cleanedText = text.replace(thinkingRegex, '');
            
            
            // 检查所有标签（必需 + 可选）
            const allTags = [...tagConfig.required, ...tagConfig.optional];
            
            for (const tag of allTags) {
              const openTagCount = (cleanedText.match(new RegExp(`<${tag}>`, 'gi')) || []).length;
              const closeTagCount = (cleanedText.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
              const isRequired = tagConfig.required.includes(tag);
              
              console.log(`[格式验证] 标签 ${tag} (${isRequired ? '必需' : '可选'}): 开始=${openTagCount}, 结束=${closeTagCount}`);
              
              // 1. 检查必需标签是否完全缺失
              if (isRequired && openTagCount === 0 && closeTagCount === 0) {
                const errorMsg = `&lt;${tag}&gt;没有`;
                console.log(`[格式验证] 添加错误: ${errorMsg}`);
                errors.push({
                  tag: tag,
                  type: 'missing',
                  message: errorMsg
                });
              }
              // 2. 检查标签闭合情况（对所有存在的标签）
              else if (openTagCount > 0 && closeTagCount === 0) {
                const errorMsg = `&lt;${tag}&gt;标签没闭合`;
                console.log(`[格式验证] 添加错误: ${errorMsg}`);
                errors.push({
                  tag: tag,
                  type: 'unclosed',
                  message: errorMsg
                });
              }
              // 3. 检查只有结束标签的情况
              else if (openTagCount === 0 && closeTagCount > 0) {
                const errorMsg = `&lt;${tag}&gt;标签缺失开始标签`;
                console.log(`[格式验证] 添加错误: ${errorMsg}`);
                errors.push({
                  tag: tag,
                  type: 'incomplete',
                  message: errorMsg
                });
              }
              // 4. 检查标签数量不匹配的情况
              else if (openTagCount > 0 && closeTagCount > 0 && openTagCount !== closeTagCount) {
                const errorMsg = `&lt;${tag}&gt;标签没闭合`;
                console.log(`[格式验证] 添加错误: ${errorMsg}`);
                errors.push({
                  tag: tag,
                  type: 'mismatch',
                  message: errorMsg
                });
              }
            }
            
            return {
              isValid: errors.length === 0,
              errors: errors,
              summary: {
                total: errors.length,
                missing: errors.filter(e => e.type === 'missing').length,
                unclosed: errors.filter(e => e.type === 'unclosed').length,
                incomplete: errors.filter(e => e.type === 'incomplete').length,
                mismatch: errors.filter(e => e.type === 'mismatch').length
              }
            };
          },


          // --- 新增：显示格式审查详情界面 ---
          showFormatValidationDetails(errors, finalText) {
            const modal = document.getElementById('format-validation-modal');
            const errorsList = document.getElementById('format-errors-list');
            const rollbackBtn = document.getElementById('format-validation-rollback');
            const continueBtn = document.getElementById('format-validation-continue');
            
            if (!modal || !errorsList || !rollbackBtn || !continueBtn) return;
            
            // 清空并填充错误列表
            errorsList.innerHTML = '';
            
            // 按错误类型分组显示
            const errorsByType = {
              missing: errors.filter(e => e.type === 'missing'),
              unclosed: errors.filter(e => e.type === 'unclosed'),
              incomplete: errors.filter(e => e.type === 'incomplete'),
              mismatch: errors.filter(e => e.type === 'mismatch')
            };
            
            // 定义错误类型的显示信息
            const typeInfo = {
              missing: { icon: '❌', title: '缺失必需标签', priority: 1 },
              unclosed: { icon: '⚠️', title: '标签未闭合', priority: 2 },
              incomplete: { icon: '🔧', title: '标签不完整', priority: 3 },
              mismatch: { icon: '🔄', title: '标签数量不匹配', priority: 4 }
            };
            
            // 按优先级显示错误
            Object.keys(typeInfo)
              .sort((a, b) => typeInfo[a].priority - typeInfo[b].priority)
              .forEach(type => {
                const typeErrors = errorsByType[type];
                if (typeErrors.length > 0) {
                  // 创建错误类型标题
                  const typeHeader = document.createElement('div');
                  typeHeader.className = 'format-error-type-header';
                  typeHeader.innerHTML = `
                    <span class="error-type-icon">${typeInfo[type].icon}</span>
                    <span class="error-type-title">${typeInfo[type].title} (${typeErrors.length})</span>
                  `;
                  errorsList.appendChild(typeHeader);
                  
                  // 显示该类型的所有错误
                  typeErrors.forEach(error => {
                    console.log(`[格式验证显示] 错误对象:`, error);
                    console.log(`[格式验证显示] 错误信息: "${error.message}"`);
                    const errorItem = document.createElement('div');
                    errorItem.className = 'format-error-item';
                    
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'format-error-message';
                    // 使用textContent而不是innerHTML，避免HTML解析
                    messageDiv.textContent = error.message.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    
                    errorItem.appendChild(messageDiv);
                    console.log(`[格式验证显示] 生成的HTML: ${errorItem.innerHTML}`);
                    errorsList.appendChild(errorItem);
                  });
                }
              });
            
            // 如果没有错误，显示占位信息
            if (errors.length === 0) {
              errorsList.innerHTML = '<div class="format-no-errors">✅ 所有标签格式正确</div>';
            }
            
            // 更新模态框标题以显示错误统计
            const modalTitle = modal.querySelector('.modal-title');
            if (modalTitle) {
              const summary = [];
              if (errorsByType.missing.length > 0) summary.push(`${errorsByType.missing.length}个缺失`);
              if (errorsByType.unclosed.length > 0) summary.push(`${errorsByType.unclosed.length}个未闭合`);
              if (errorsByType.incomplete.length > 0) summary.push(`${errorsByType.incomplete.length}个不完整`);
              if (errorsByType.mismatch.length > 0) summary.push(`${errorsByType.mismatch.length}个不匹配`);
              
              const summaryText = summary.length > 0 ? ` (${summary.join(', ')})` : '';
              modalTitle.textContent = `🔍 格式审查详情 - 发现 ${errors.length} 个问题${summaryText}`;
            }
            
            // 绑定按钮事件
            rollbackBtn.onclick = () => {
              const gameTextDisplay = document.getElementById('game-text-display');
              if (gameTextDisplay && this.lastValidGametxtHTML) {
                // 恢复到上一次有效的内容
                gameTextDisplay.innerHTML = this.lastValidGametxtHTML;
                this.updateLiveWordCount(); // 新增：调用字数统计函数
                this.showTemporaryMessage('内容已回退。');

                // 新增：恢复UI元素可见性
                // 恢复思维链
                this.lastExtractedThinking = this._extractLastTagContent('thinking', this.lastValidGametxtHTML, true);
                this.saveLastThinking(); // 持久化恢复的思维内容
                
                const thinkingProcessContainer = document.getElementById('thinking-process-container');
                const thinkingProcessContent = document.getElementById('thinking-process-content');

                if (this.lastExtractedThinking && this.lastExtractedThinking.trim() !== '') {
                    if (thinkingProcessContainer) {
                        thinkingProcessContainer.style.display = 'block'; // 强制显示容器
                    }
                    if (thinkingProcessContent) {
                        try {
                            if (typeof formatAsDisplayedMessage === 'function') {
                                const cleanedContent = this.lastExtractedThinking
                                    .replace(/<thinking>/g, '')
                                    .replace(/<\/thinking>/g, '');
                                thinkingProcessContent.innerHTML = formatAsDisplayedMessage(cleanedContent);
                            } else {
                                thinkingProcessContent.innerHTML = this.simpleMarkdownParse(this.lastExtractedThinking);
                            }
                        } catch (error) {
                            console.error('Error formatting thinking content on rollback:', error);
                            thinkingProcessContent.textContent = this.lastExtractedThinking;
                        }
                        thinkingProcessContent.classList.add('expanded'); // 默认展开
                        const thinkingProcessIcon = document.getElementById('thinking-process-icon');
                        if (thinkingProcessIcon) {
                            thinkingProcessIcon.classList.remove('collapsed');
                            thinkingProcessIcon.textContent = '▼';
                        }
                    }
                } else {
                    if (thinkingProcessContainer) {
                        thinkingProcessContainer.style.display = 'none'; // 如果没有内容则隐藏
                    }
                }

                // 恢复变量改变提醒
                this.updateVariableChangesReminder();

                // 恢复行动选项
                this.isActionOptionsEnabled = true; // 强制开启行动选项显示
                const actionOptionsContainer = document.getElementById('action-options-container');
                if (actionOptionsContainer) {
                    actionOptionsContainer.style.display = 'flex'; // 确保容器可见
                }
                const lastActionOptions = this._extractLastTagContent('行动选项', this.lastValidGametxtHTML) || this._extractLastTagContent('action', this.lastValidGametxtHTML);
                this.renderActionOptions(lastActionOptions);
              }
              this.closeModal('format-validation-modal');
              // 关闭等待消息
              this.hideWaitingMessage();
            };
            
            continueBtn.onclick = () => {
              this.closeModal('format-validation-modal');
              // 接受当前有问题的内容，填充到0层
              // 自动补全</UpdateVariable>标签（如果需要）
              // 继续正常的数据处理流程
              // 更新内容缓存为当前版本
              // 关闭等待消息并显示确认
              
              // 更新缓存，以便下次出错时回退到这个版本
              const gameTextDisplay = document.getElementById('game-text-display');
              if (gameTextDisplay) {
                this.lastValidGametxtHTML = gameTextDisplay.innerHTML;
              }
              // 确保等待消息被关闭
              this.hideWaitingMessage();
              this.showTemporaryMessage('已保留内容，将继续进行数据处理。');
              // 继续处理，包括UpdateVariable自动补全
              this.continueProcessingWithAutoFix(finalText);
            };
            
            this.openModal('format-validation-modal');
          },

          // --- 新增：带自动修复的继续处理函数 ---
          async continueProcessingWithAutoFix(textToProcess) {
            console.log('[归墟] continueProcessingWithAutoFix 接收到的文本:', textToProcess);
            
            // 检查文本是否为空或无效
            if (!textToProcess || textToProcess.trim() === '') {
              console.error('[归墟] continueProcessingWithAutoFix 接收到空文本，停止处理');
              this.hideWaitingMessage();
              this.showTemporaryMessage('错误：接收到空内容，无法继续处理。');
              return;
            }
            
            // 检查并自动补全UpdateVariable标签
            let fixedText = this.autoFixUpdateVariable(textToProcess);
            
            // 调用原有的处理逻辑
            await this.continueProcessing(fixedText);
          },

          // --- 新增：UpdateVariable标签自动补全 ---
          autoFixUpdateVariable(text) {
            // 只检查是否存在</UpdateVariable>，如果不存在，则在末尾添加一个
            if (text.includes('<UpdateVariable>') && text.indexOf('</UpdateVariable>') === -1) {
              console.log('[归墟] 未找到 </UpdateVariable> 标签，自动在末尾添加。');
              this.showTemporaryMessage('已自动补全UpdateVariable结束标签', 3000);
              return text + '</UpdateVariable>';
            }
            return text;
          },

          // --- 新增：专门用于格式验证后继续处理的函数 ---
          async continueProcessing(textToProcess) {
            console.log('[归墟] continueProcessing 被调用，文本长度:', textToProcess ? textToProcess.length : 0);
            
            this.updateWaitingMessage('梦星大人正在处理数据逻辑，请怀揣崇高敬意等待ing');

            // 在处理主要逻辑前，先准备好清理过的文本，用于后续计算
            const thinkingRegex = /<thinking>[\s\S]*?<\/thinking>/gi;
            const cleanedText = textToProcess.replace(thinkingRegex, '');

            // 1. 提取所有数据
            this.lastExtractedNovelText = this._extractLastTagContent('gametxt', textToProcess);
            this.lastExtractedJourney = this._extractLastTagContent('本世历程', textToProcess);
            this.lastExtractedPastLives = this._extractLastTagContent('往世涟漪', textToProcess);
            this.lastExtractedThinking = this._extractLastTagContent('thinking', textToProcess, true);
            this.lastExtractedVariables = this._extractLastTagContent('UpdateVariable', textToProcess, true);
            this.lastExtractedCharacterCard = this._extractLastTagContent('角色提取', textToProcess);
            this.lastExtractedMapCommands = this._extractLastTagContent('地图', textToProcess);

            this.saveLastThinking();
            this.updateThinkingButtonVisibility();
            this.updateVariableChangesReminder();

            // 2. 更新变量
            const updateScript = textToProcess;
            if (updateScript && this.currentMvuState) {
                const inputData = { old_variables: this.currentMvuState };
                let mvuSucceeded = false;
                try {
                    const mvuPromise = eventEmit('mag_invoke_mvu', updateScript, inputData);
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('MVU event timeout')), 3000));
                    await Promise.race([mvuPromise, timeoutPromise]);

                    if (inputData.new_variables) {
                      this.currentMvuState = this._safeLoadMvuData(inputData.new_variables);
                      this.renderUI(this.currentMvuState.stat_data);
                        mvuSucceeded = true;
                    } else {
                        console.log('[归墟] mvu 未返回新状态，尝试前端备用方案。');
                    }
                } catch (eventError) {
                    console.error('[归墟] 调用 mag_invoke_mvu 事件时发生错误或超时，尝试前端备用方案:', eventError);
                }

                if (!mvuSucceeded) {
                    const modifiedState = this._applyUpdateFallback(updateScript, this.currentMvuState);
                    if (modifiedState) {
                        this.currentMvuState = modifiedState;
                        this.renderUI(this.currentMvuState.stat_data);
                    }
                }
            }

            // 3. 处理地图指令
            if (this.lastExtractedMapCommands) {
                await this.handleMapUpdateCommand(this.lastExtractedMapCommands);
            }

            // 4. 更新行动选项
            let actionOptionsContent = this._extractLastTagContent('行动选项', textToProcess);
            if (!actionOptionsContent) {
               actionOptionsContent = this._extractLastTagContent('action', textToProcess);
            }
            this.renderActionOptions(actionOptionsContent);

            // 5. 静默保存到第0层
            const messages = await getChatMessages('0');
            if (messages && messages.length > 0) {
                const messageZero = messages[0];
                messageZero.message = textToProcess;
                messageZero.data = this.currentMvuState;
                await TavernHelper.setChatMessages([messageZero], { refresh: 'none' });
            }

            // 6. 清理工作
            const input = document.getElementById('quick-send-input');
            if (input) input.value = '';
            this.pendingActions = [];
            this.savePendingActions();
            this.showTemporaryMessage('伟大梦星已回应。');

            // 7. 自动存档
            if (this.isAutoSaveEnabled) {
                await this.performAutoSave();
     
                        this.lastUserMessage = '';
       }

            // 新增步骤：渲染主界面的正文内容
            const gameTextDisplay = document.getElementById('game-text-display');
            if (gameTextDisplay && this.lastExtractedNovelText) {
                gameTextDisplay.innerHTML = this.formatMessageContent(this.lastExtractedNovelText);
                this.updateLiveWordCount();
            }

            // 8. 最终刷新UI
            await this.updateDynamicData();
            this.loadEquipmentState();
            
            // 9. 如果是随机模式，切换背景图
            if (this.backgroundMode === 'random') {
              this.applyRandomBackground();
            }
            
            this.hideWaitingMessage();
          },

          async handleStreamEnd(finalText) {
            console.log('[归墟] 流式传输结束，最终文本:', finalText);
            // 修复：在处理任何逻辑之前，立即停止生成
            if (typeof TavernHelper.stopGeneration === 'function') {
              TavernHelper.stopGeneration();
              console.log('[归墟] 已调用 TavernHelper.stopGeneration()');
            }

            this.isStreamingGametxt = false; // 重置流式状态

            // --- 新增：处理AI生成的角色卡 --- 
            if (this.pendingCharacterCardGeneration) {
                const charName = this.pendingCharacterCardGeneration;
                const tagName = 'CharacterCard';
                const cardContent = this._extractLastTagContent(tagName, finalText);

                if (cardContent) {
                    try {
                        const bookName = '1归墟';
                        const allEntries = await TavernHelper.getLorebookEntries(bookName);
                        const targetEntry = allEntries.find(entry => entry.comment === charName);
                        if (targetEntry) {
                            await TavernHelper.setLorebookEntries(bookName, [{ uid: targetEntry.uid, content: cardContent }]);
                            this.showTemporaryMessage(`已成功为“${charName}”生成并写入角色卡！`, 3000);
                        } else {
                            throw new Error(`未找到名为“${charName}”的世界书条目。`);
                        }
                    } catch (error) {
                        console.error('写入生成的角色卡失败:', error);
                        this.showTemporaryMessage(`错误：写入“${charName}”的角色卡失败！`, 4000);
                    }
                } else {
                    this.showTemporaryMessage(`警告：AI回复中未找到“${charName}”的角色卡标签，请手动检查并填入世界书。`, 5000);
                }
                this.pendingCharacterCardGeneration = null; // 处理完毕，重置追踪变量
            }


            // 格式验证逻辑
            if (this.isFormatValidationEnabled) {
                const validationResult = this.validateResponseFormat(finalText);
                if (!validationResult.isValid) {
                    // 显示详细的格式审查界面，让用户决定如何操作
                    this.showFormatValidationDetails(validationResult.errors, finalText);
                } else {
                    // 格式正确，缓存有效HTML，然后继续处理
                    const gameTextDisplay = document.getElementById('game-text-display');
                    if (gameTextDisplay) {
                        this.lastValidGametxtHTML = gameTextDisplay.innerHTML;
                    }
                    // 直接调用带有自动修复功能的处理函数
                    await this.continueProcessingWithAutoFix(finalText);
                }
            } else {
                // 禁用审查，直接处理
                const gameTextDisplay = document.getElementById('game-text-display');
                if (gameTextDisplay) {
                    this.lastValidGametxtHTML = gameTextDisplay.innerHTML;
                }
                // 直接调用带有自动修复功能的处理函数
                await this.continueProcessingWithAutoFix(finalText);
            }

            // 新增：AI生成结束后，如果开启了自动生成，则触发一次分段记忆更新
            if (this.isSegmentedMemoryAutoGenerateEnabled) {
                console.log('[归墟] AI生成结束，触发分段记忆更新...');
                // 使用 isPolling = false 来确保UI反馈，让用户知道正在发生什么
                await this.generateSegmentedMemory(false);
            }
            if (this.isSmallSummaryAutoOn) {
                console.log('[归墟] AI生成结束，触发小总结更新...');
                await this.generateSmallSummary(false);
            }
            if (this.isLargeSummaryAutoOn) {
                console.log('[归墟] AI生成结束，触发大总结更新...');
                await this.generateLargeSummary(false);
            }
          },

          // --- 新增：全屏功能 ---
          toggleFullScreen() {
            const elem = document.querySelector('.guixu-root-container');
            if (!document.fullscreenElement) {
              elem.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
              });
            } else {
              document.exitFullscreen();
            }
          },

          exitFullScreen() {
              if (document.fullscreenElement) {
                  document.exitFullscreen();
              }
          },

          // --- 新增：面板折叠功能 ---
          toggleLeftPanel() {
            this.leftPanelCollapsed = !this.leftPanelCollapsed;
            this.updatePanelStates();
            this.savePanelStates();
          },

          toggleRightPanel() {
            this.rightPanelCollapsed = !this.rightPanelCollapsed;
            this.updatePanelStates();
            this.savePanelStates();
          },

          updatePanelStates() {
            const gameContainer = document.querySelector('.game-container');
            const leftPanel = document.querySelector('.character-panel');
            const rightPanel = document.querySelector('.interaction-panel');
            
            if (!gameContainer || !leftPanel || !rightPanel) return;

            // 更新game-container的CSS类
            gameContainer.classList.toggle('left-panel-collapsed', this.leftPanelCollapsed);
            gameContainer.classList.toggle('right-panel-collapsed', this.rightPanelCollapsed);
            gameContainer.classList.toggle('both-panels-collapsed', this.leftPanelCollapsed && this.rightPanelCollapsed);

            // 更新面板的折叠状态
            leftPanel.classList.toggle('collapsed', this.leftPanelCollapsed);
            rightPanel.classList.toggle('collapsed', this.rightPanelCollapsed);

            // 更新箭头方向 - 隐藏/显示模式
            const leftArrow = document.querySelector('.left-panel-toggle .toggle-arrow');
            const rightArrow = document.querySelector('.right-panel-toggle .toggle-arrow');
            
            if (leftArrow) {
              leftArrow.textContent = this.leftPanelCollapsed ? '▶' : '◀';
            }
            if (rightArrow) {
              rightArrow.textContent = this.rightPanelCollapsed ? '◀' : '▶';
            }
          },

          loadPanelStates() {
            try {
              const savedStates = localStorage.getItem('guixu_panel_states');
              if (savedStates) {
                const states = JSON.parse(savedStates);
                this.leftPanelCollapsed = states.leftPanelCollapsed || false;
                this.rightPanelCollapsed = states.rightPanelCollapsed || false;
                this.updatePanelStates();
              }
            } catch (e) {
              console.error('加载面板状态失败:', e);
            }
          },

          savePanelStates() {
            try {
              const states = {
                leftPanelCollapsed: this.leftPanelCollapsed,
                rightPanelCollapsed: this.rightPanelCollapsed
              };
              localStorage.setItem('guixu_panel_states', JSON.stringify(states));
            } catch (e) {
              console.error('保存面板状态失败:', e);
            }
          },

          toggleCharacterPanel() {
              this.isCharacterPanelVisible = !this.isCharacterPanelVisible;
              const container = document.querySelector('.guixu-root-container');
              const floatingBtn = document.getElementById('floating-character-btn');

              if (container) {
                  container.classList.toggle('character-panel-visible', this.isCharacterPanelVisible);
              }

              if (floatingBtn) {
                  floatingBtn.classList.toggle('active', this.isCharacterPanelVisible);
                  floatingBtn.textContent = this.isCharacterPanelVisible ? '收起' : '角色';
              }
          },

          toggleInteractionPanel() {
              this.isInteractionPanelVisible = !this.isInteractionPanelVisible;
              const container = document.querySelector('.guixu-root-container');
              const floatingBtn = document.getElementById('floating-interaction-btn');

              if (container) {
                  container.classList.toggle('interaction-panel-visible', this.isInteractionPanelVisible);
              }

              if (floatingBtn) {
                  floatingBtn.classList.toggle('active', this.isInteractionPanelVisible);
                  floatingBtn.textContent = this.isInteractionPanelVisible ? '收起' : '功能';
              }
          },

          // --- 新增：重新处理变量 ---
          async reprocessVariables() {
            this.showWaitingMessage('正在重新处理变量...');
            try {
              const messages = await getChatMessages(getCurrentMessageId());
              if (messages && messages.length > 0) {
                const lastMessageContent = messages[0].message;
                await this.continueProcessingWithAutoFix(lastMessageContent);
                this.showTemporaryMessage('变量已重新处理。');
              } else {
                this.showTemporaryMessage('错误：找不到当前消息以重新处理。', 5000, true);
              }
            } catch (error) {
              console.error('重新处理变量时出错:', error);
              this.showTemporaryMessage('重新处理变量时发生错误，请查看控制台。', 5000, true);
            } finally {
              this.hideWaitingMessage();
            }
          },

          // --- 新增：初始化可拖动按钮功能 ---
          initDraggableButtons() {
              const characterBtn = document.getElementById('floating-character-btn');
              const interactionBtn = document.getElementById('floating-interaction-btn');

              if (characterBtn) {
                  this.makeDraggable(characterBtn, () => this.toggleCharacterPanel());
              }
              if (interactionBtn) {
                  this.makeDraggable(interactionBtn, () => this.toggleInteractionPanel());
              }
          },

          // --- 新增：使元素可拖动 ---
          makeDraggable(element, clickCallback) {
              let isDragging = false;
              let startX, startY, startLeft, startTop;
              let hasMoved = false;

              // 鼠标事件
              element.addEventListener('mousedown', (e) => {
                  isDragging = true;
                  hasMoved = false;
                  startX = e.clientX;
                  startY = e.clientY;
                  startLeft = parseInt(window.getComputedStyle(element).left, 10);
                  startTop = parseInt(window.getComputedStyle(element).top, 10);
                  element.classList.add('dragging');
                  e.preventDefault();
              });

              document.addEventListener('mousemove', (e) => {
                  if (!isDragging) return;
                  
                  const deltaX = e.clientX - startX;
                  const deltaY = e.clientY - startY;
                  
                  // 如果有任何移动，立即认为是拖动（延迟为0）
                  if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                      hasMoved = true;
                  }

                  const newLeft = startLeft + deltaX;
                  const newTop = startTop + deltaY;

                  // 限制在屏幕范围内
                  const maxLeft = window.innerWidth - element.offsetWidth;
                  const maxTop = window.innerHeight - element.offsetHeight;

                  element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
                  element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
              });

              document.addEventListener('mouseup', () => {
                  if (isDragging) {
                      isDragging = false;
                      element.classList.remove('dragging');
                      
                      // 如果没有移动，执行点击回调
                      if (!hasMoved) {
                          clickCallback();
                      }
                  }
              });

              // 触摸事件（移动端）
              element.addEventListener('touchstart', (e) => {
                  isDragging = true;
                  hasMoved = false;
                  const touch = e.touches[0];
                  startX = touch.clientX;
                  startY = touch.clientY;
                  startLeft = parseInt(window.getComputedStyle(element).left, 10);
                  startTop = parseInt(window.getComputedStyle(element).top, 10);
                  element.classList.add('dragging');
                  e.preventDefault();
              });

              element.addEventListener('touchmove', (e) => {
                  if (!isDragging) return;
                  
                  const touch = e.touches[0];
                  const deltaX = touch.clientX - startX;
                  const deltaY = touch.clientY - startY;
                  
                  // 如果有任何移动，立即认为是拖动（延迟为0）
                  if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                      hasMoved = true;
                  }

                  const newLeft = startLeft + deltaX;
                  const newTop = startTop + deltaY;

                  // 限制在屏幕范围内
                  const maxLeft = window.innerWidth - element.offsetWidth;
                  const maxTop = window.innerHeight - element.offsetHeight;

                  element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
                  element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
                  e.preventDefault();
              });

              element.addEventListener('touchend', () => {
                  if (isDragging) {
                      isDragging = false;
                      element.classList.remove('dragging');
                      
                      // 如果没有移动，执行点击回调
                      if (!hasMoved) {
                          clickCallback();
                      }
                  }
              });
          },

          // --- 新增：窗口大小调整功能 (实时调整) ---
          toggleWindowSizePanel() {
              const panel = document.getElementById('window-size-panel');
              if (panel) {
                  const isVisible = panel.style.display === 'block';
                  panel.style.display = isVisible ? 'none' : 'block';
                  if (!isVisible) {
                      this.loadCurrentWindowSize();
                  }
              }
          },

          hideWindowSizePanel() {
              const panel = document.getElementById('window-size-panel');
              if (panel) {
                  panel.style.display = 'none';
              }
          },
          
          loadCurrentWindowSize() {
              const container = document.querySelector('.guixu-root-container');
              const gameContainer = document.querySelector('.game-container');
              if (container && gameContainer) {
                  const currentWidth = parseInt(container.style.maxWidth) || 900;
                  const currentHeight = parseInt(gameContainer.style.height) || 600;
                  
                  const widthSlider = document.getElementById('width-slider');
                  const heightSlider = document.getElementById('height-slider');
                  const widthDisplay = document.getElementById('width-display');
                  const heightDisplay = document.getElementById('height-display');
                  
                  if (widthSlider) widthSlider.value = currentWidth;
                  if (heightSlider) heightSlider.value = currentHeight;
                  if (widthDisplay) widthDisplay.textContent = `${currentWidth}px`;
                  if (heightDisplay) heightDisplay.textContent = `${currentHeight}px`;
              }
              
              // 同时加载模态框当前大小
              this.loadCurrentModalSize();
          },

          loadCurrentModalSize() {
              // 从localStorage加载或使用默认值
              const savedState = localStorage.getItem('guixu_modal_size');
              let modalWidth = 800;
              let modalHeight = 600;
              
              if (savedState) {
                  try {
                      const { width, height } = JSON.parse(savedState);
                      modalWidth = width || 800;
                      modalHeight = height || 600;
                  } catch (e) {
                      console.error('解析模态框大小状态失败:', e);
                  }
              }
              
              const modalWidthSlider = document.getElementById('modal-width-slider');
              const modalHeightSlider = document.getElementById('modal-height-slider');
              const modalWidthDisplay = document.getElementById('modal-width-display');
              const modalHeightDisplay = document.getElementById('modal-height-display');
              
              if (modalWidthSlider) modalWidthSlider.value = modalWidth;
              if (modalHeightSlider) modalHeightSlider.value = modalHeight;
              if (modalWidthDisplay) modalWidthDisplay.textContent = `${modalWidth}px`;
              if (modalHeightDisplay) modalHeightDisplay.textContent = `${modalHeight}px`;
          },

          updateWidthDisplay(value) {
              const widthDisplay = document.getElementById('width-display');
              if (widthDisplay) {
                  widthDisplay.textContent = `${value}px`;
              }
              this.applyWindowSize(value, null);
          },

          updateHeightDisplay(value) {
              const heightDisplay = document.getElementById('height-display');
              if (heightDisplay) {
                  heightDisplay.textContent = `${value}px`;
              }
              this.applyWindowSize(null, value);
          },
          
          applyWindowSize(newWidth, newHeight) {
               const container = document.querySelector('.guixu-root-container');
               const gameContainer = document.querySelector('.game-container');

               if (container && gameContainer) {
                   if (newWidth !== null) {
                       container.style.maxWidth = `${newWidth}px`;
                   }
                   if (newHeight !== null) {
                       gameContainer.style.height = `${newHeight}px`;
                   }
               }
               // 实时保存，可能会有性能问题，但按指示忽略lodash
               this.saveWindowSizeState();
          },
          
          resetWindowSize() {
              const defaultWidth = 900;
              const defaultHeight = 600;
              
              const widthSlider = document.getElementById('width-slider');
              const heightSlider = document.getElementById('height-slider');
              
              if (widthSlider) widthSlider.value = defaultWidth;
              if (heightSlider) heightSlider.value = defaultHeight;

              this.updateWidthDisplay(defaultWidth);
              this.updateHeightDisplay(defaultHeight);

              this.showTemporaryMessage('已重置为默认大小');
          },

          saveWindowSizeState() {
              try {
                  const container = document.querySelector('.guixu-root-container');
                  const gameContainer = document.querySelector('.game-container');
                  
                  if (container && gameContainer) {
                      // 从实际的DOM样式中获取当前尺寸
                      const currentWidth = parseInt(container.style.maxWidth) || 900;
                      const currentHeight = parseInt(gameContainer.style.height) || 600;
                      
                      const sizeState = {
                          width: currentWidth,
                          height: currentHeight
                      };
                      
                      localStorage.setItem('guixu_window_size', JSON.stringify(sizeState));
                      console.log(`窗口大小已保存: ${currentWidth}x${currentHeight}`);
                  }
              } catch (e) {
                  console.error('保存窗口大小状态失败:', e);
              }
          },
          
          loadWindowSizeState() {
              try {
                  const savedState = localStorage.getItem('guixu_window_size');
                  if (savedState) {
                      const { width, height } = JSON.parse(savedState);
                      if (width && height) {
                          // 直接应用到DOM，避免循环调用saveWindowSizeState
                          const container = document.querySelector('.guixu-root-container');
                          const gameContainer = document.querySelector('.game-container');
                          
                          if (container && gameContainer) {
                              container.style.maxWidth = `${width}px`;
                              gameContainer.style.height = `${height}px`;
                              
                              // 更新滑块显示值
                              const widthSlider = document.getElementById('width-slider');
                              const heightSlider = document.getElementById('height-slider');
                              const widthDisplay = document.getElementById('width-display');
                              const heightDisplay = document.getElementById('height-display');
                              
                              if (widthSlider) widthSlider.value = width;
                              if (heightSlider) heightSlider.value = height;
                              if (widthDisplay) widthDisplay.textContent = `${width}px`;
                              if (heightDisplay) heightDisplay.textContent = `${height}px`;
                              
                              console.log(`窗口大小已从缓存恢复: ${width}x${height}`);
                          }
                      }
                  }
              } catch (e) {
                  console.error('加载窗口大小状态失败:', e);
              }
          },

          // --- 新增：二级窗口（模态框）大小调整功能 ---
          updateModalWidthDisplay(value) {
              const modalWidthDisplay = document.getElementById('modal-width-display');
              if (modalWidthDisplay) {
                  modalWidthDisplay.textContent = `${value}px`;
              }
              this.applyModalSize(value, null);
          },

          updateModalHeightDisplay(value) {
              const modalHeightDisplay = document.getElementById('modal-height-display');
              if (modalHeightDisplay) {
                  modalHeightDisplay.textContent = `${value}px`;
              }
              this.applyModalSize(null, value);
          },

          applyModalSize(newWidth, newHeight) {
              // 应用到所有模态框的 .modal-content
              const modalContents = document.querySelectorAll('.modal-content');
              modalContents.forEach(modalContent => {
                  // 豁免人物关系模态框，它的尺寸由其内部CSS控制
                  if (modalContent.closest('#relationships-modal')) {
                      return;
                  }
                  if (newWidth !== null) {
                      modalContent.style.maxWidth = `${newWidth}px`;
                      modalContent.style.width = `${Math.min(newWidth, window.innerWidth * 0.9)}px`;
                  }
                  if (newHeight !== null) {
                      modalContent.style.height = `${Math.min(newHeight, window.innerHeight * 0.9)}px`;
                      modalContent.style.maxHeight = `${Math.min(newHeight, window.innerHeight * 0.9)}px`;
                      // 确保内容区域也能正确显示
                      modalContent.style.overflow = 'auto';
                  }
              });
              
              // 实时保存模态框大小状态
              this.saveModalSizeState();
          },

          resetModalSize() {
              const defaultWidth = 800;
              const defaultHeight = 600;
              
              const modalWidthSlider = document.getElementById('modal-width-slider');
              const modalHeightSlider = document.getElementById('modal-height-slider');
              
              if (modalWidthSlider) modalWidthSlider.value = defaultWidth;
              if (modalHeightSlider) modalHeightSlider.value = defaultHeight;

              this.updateModalWidthDisplay(defaultWidth);
              this.updateModalHeightDisplay(defaultHeight);

              this.showTemporaryMessage('模态框大小已重置为默认');
          },

          saveModalSizeState() {
              try {
                  const modalWidthSlider = document.getElementById('modal-width-slider');
                  const modalHeightSlider = document.getElementById('modal-height-slider');
                  
                  if (modalWidthSlider && modalHeightSlider) {
                      const currentWidth = parseInt(modalWidthSlider.value) || 800;
                      const currentHeight = parseInt(modalHeightSlider.value) || 600;
                      
                      const modalSizeState = {
                          width: currentWidth,
                          height: currentHeight
                      };
                      
                      localStorage.setItem('guixu_modal_size', JSON.stringify(modalSizeState));
                      console.log(`模态框大小已保存: ${currentWidth}x${currentHeight}`);
                  }
              } catch (e) {
                  console.error('保存模态框大小状态失败:', e);
              }
          },

          loadModalSizeState() {
              try {
                  const savedState = localStorage.getItem('guixu_modal_size');
                  if (savedState) {
                      const { width, height } = JSON.parse(savedState);
                      if (width && height) {
                          // 更新滑块显示值
                          const modalWidthSlider = document.getElementById('modal-width-slider');
                          const modalHeightSlider = document.getElementById('modal-height-slider');
                          const modalWidthDisplay = document.getElementById('modal-width-display');
                          const modalHeightDisplay = document.getElementById('modal-height-display');
                          
                          if (modalWidthSlider) modalWidthSlider.value = width;
                          if (modalHeightSlider) modalHeightSlider.value = height;
                          if (modalWidthDisplay) modalWidthDisplay.textContent = `${width}px`;
                          if (modalHeightDisplay) modalHeightDisplay.textContent = `${height}px`;
                          
                          // 应用到现有的模态框
                          this.applyModalSize(width, height);
                          
                          console.log(`模态框大小已从缓存恢复: ${width}x${height}`);
                      }
                  }
              } catch (e) {
                  console.error('加载模态框大小状态失败:', e);
              }
          },

         // --- 新增：状态效果弹出窗口 ---
         toggleStatusPopup() {
           const popup = document.getElementById('status-effects-popup');
           if (popup) {
             const isVisible = popup.style.display === 'flex';
             popup.style.display = isVisible ? 'none' : 'flex';
           }
         },

          SafeGetValue(obj, path, defaultValue = 'N/A') {
            let keys = Array.isArray(path) ? path : path.split('.');
            let current = obj;
            for (let i = 0; i < keys.length; i++) {
              if (
                current === undefined ||
                current === null ||
                typeof current !== 'object' ||
                !current.hasOwnProperty(keys[i])
              ) {
                return defaultValue;
              }
              current = current[keys[i]];
            }
            if (current === undefined || current === null) {
              return defaultValue;
            }
            // 如果是对象（但不是数组），直接返回
            if (typeof current === 'object' && !Array.isArray(current)) {
               return current;
           }
            if (Array.isArray(current)) {
              if (current.length > 0) {
                const actualValue = current[0];
                if (typeof actualValue === 'boolean') return actualValue;
                // 如果数组的第一个元素是对象，直接返回该对象
                if (typeof actualValue === 'object' && actualValue !== null) {
                   return actualValue;
                }
                return String(actualValue);
              } else {
                return defaultValue;
              }
            }
            if (typeof current === 'boolean') return current;
            return String(current);
          },

          async updateDynamicData() {
            try {
              // 加载核心mvu数据
              const messages = await getChatMessages(getCurrentMessageId());
              if (messages && messages.length > 0 && messages[0].data) {
                // 缓存完整的 mvu 状态，应用安全修复
                const rawData = messages[0].data;
                this.currentMvuState = this._safeLoadMvuData(rawData);
                this.renderUI(this.currentMvuState.stat_data);
              } else {
                console.warn('无法从当前消息中加载 mvu data。');
              }

              // 新增：加载并显示当前场景正文
              // 此函数现在处理自己的文本格式化。
              await this.loadAndDisplayCurrentScene();
            } catch (error) {
              console.error('更新归墟动态数据时出错:', error);
            }
          },

          // 新增：统一的UI渲染函数
          renderUI(data) {
            if (!data) {
              console.warn('RenderUI 调用失败：没有提供数据。');
              return;
            }
            const updateText = (id, value, style = '') => {
              const el = document.getElementById(id);
              if (el) {
                el.innerText = value;
                if (style) {
                  el.setAttribute('style', style);
                }
              }
            };

            // 变量结构更新：直接读取'当前境界'
            const jingjieValue = this.SafeGetValue(data, '当前境界', '...');
            const match = jingjieValue.match(/^(\S{2})/);
            const jingjieTier = match ? match[1] : '';
            const jingjieStyle = this.getJingJieStyle(jingjieTier);
            updateText('val-jingjie', jingjieValue); // 移除样式，只更新文本
            updateText('val-jinian', this.SafeGetValue(data, '当前时间纪年'));
            const currentWorld = this.SafeGetValue(data, '当前第x世', '1');
            updateText('val-current-world', `第${currentWorld}世`);
            const charge = this.SafeGetValue(data, '归墟充能时间', '0');
            updateText('val-guixu-charge-text', `${charge}%`);
            const chargeBar = document.getElementById('bar-guixu-charge');
            if (chargeBar) chargeBar.style.setProperty('--guixu-charge', `${charge}%`);

            // 此处不再需要填充 this.baseAttributes，因为 updateDisplayedAttributes 会直接从 stat_data 读取
            
            this.updateTalentAndLinggen(data);
            this.loadEquipmentFromMVU(data);
            this.updateDisplayedAttributes(); // 核心渲染函数

            // --- 变量适配：重构状态效果渲染逻辑 ---
            const summaryTextEl = document.getElementById('status-summary-text');
            const popupListEl = document.getElementById('status-effects-popup-list');
            if (summaryTextEl && popupListEl) {
              // 新结构：'当前状态' 是一个对象，键是状态名，值是描述
              const statuses = this.SafeGetValue(data, '当前状态', {});
              
              // 过滤掉元数据
              const statusEntries = Object.entries(statuses).filter(([key]) => key !== '$meta');

              if (statusEntries.length > 0) {
                summaryTextEl.textContent = `当前有 ${statusEntries.length} 个状态效果`;
                
                popupListEl.innerHTML = statusEntries.map(([name, description]) => {
                  return `
                    <div class="status-effect-item">
                      <strong>${name}:</strong> ${description}
                    </div>
                  `;
                }).join('');
              } else {
                summaryTextEl.textContent = '当前无状态效果';
                popupListEl.innerHTML = '<div class="status-effect-item">暂无</div>';
              }
            }
          },

          // --- Event Listeners for Buttons and Modals ---
          bindStaticListeners() {
            if (this.listenersBound) return; // 如果已经绑定过，则直接返回

            // 新增：为视图切换按钮绑定监听器
            document.getElementById('view-toggle-btn')?.addEventListener('click', () => this.toggleViewMode());
            document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullScreen());
            document.getElementById('exit-fullscreen-btn')?.addEventListener('click', () => this.exitFullScreen());

            // 新增：为顶部全屏按钮绑定监听器
            document.getElementById('top-fullscreen-btn')?.addEventListener('click', () => this.toggleFullScreen());
            document.getElementById('top-exit-fullscreen-btn')?.addEventListener('click', () => this.exitFullScreen());

            // 新增：为变量改变提醒绑定监听器
            document.getElementById('variable-changes-header')?.addEventListener('click', () => this.toggleVariableChanges());

            // 新增：为面板折叠按钮绑定监听器
            document.getElementById('left-panel-toggle')?.addEventListener('click', () => this.toggleLeftPanel());
            document.getElementById('right-panel-toggle')?.addEventListener('click', () => this.toggleRightPanel());

            document.addEventListener('fullscreenchange', () => {
                // 右侧面板的全屏按钮
                const fullscreenBtn = document.getElementById('fullscreen-btn');
                const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');
                // 顶部状态栏的全屏按钮
                const topFullscreenBtn = document.getElementById('top-fullscreen-btn');
                const topExitFullscreenBtn = document.getElementById('top-exit-fullscreen-btn');
                
                if (document.fullscreenElement) {
                    // 进入全屏模式
                    if (fullscreenBtn) fullscreenBtn.style.display = 'none';
                    if (exitFullscreenBtn) exitFullscreenBtn.style.display = 'flex';
                    if (topFullscreenBtn) topFullscreenBtn.style.display = 'none';
                    if (topExitFullscreenBtn) topExitFullscreenBtn.style.display = 'flex';
                } else {
                    // 退出全屏模式
                    if (fullscreenBtn) fullscreenBtn.style.display = 'flex';
                    if (exitFullscreenBtn) exitFullscreenBtn.style.display = 'none';
                    if (topFullscreenBtn) topFullscreenBtn.style.display = 'flex';
                    if (topExitFullscreenBtn) topExitFullscreenBtn.style.display = 'none';
                }
            });
            // 浮动按钮事件监听器和拖动功能
            this.initDraggableButtons();
            
            // 新增：为窗口大小调整按钮和控制面板绑定事件监听器
            document.getElementById('window-size-btn')?.addEventListener('click', () => this.toggleWindowSizePanel());
            document.getElementById('window-size-close')?.addEventListener('click', () => this.hideWindowSizePanel());
            document.getElementById('width-slider')?.addEventListener('input', (e) => this.updateWidthDisplay(e.target.value));
            document.getElementById('height-slider')?.addEventListener('input', (e) => this.updateHeightDisplay(e.target.value));
            document.getElementById('reset-size-btn')?.addEventListener('click', () => this.resetWindowSize());
            
            // 新增：为二级窗口（模态框）大小调整绑定事件监听器
            document.getElementById('modal-width-slider')?.addEventListener('input', (e) => this.updateModalWidthDisplay(e.target.value));
            document.getElementById('modal-height-slider')?.addEventListener('input', (e) => this.updateModalHeightDisplay(e.target.value));
            document.getElementById('reset-modal-size-btn')?.addEventListener('click', () => this.resetModalSize());
            
            // --- 新增：为状态效果弹出窗口绑定事件 ---
            document.getElementById('status-summary-button')?.addEventListener('click', () => this.toggleStatusPopup());
            document.getElementById('status-effects-popup-close')?.addEventListener('click', () => this.toggleStatusPopup());
            
            // 新增：为世界书序号输入框绑定监听
            // 新增：为统一的序号输入框绑定监听
            document.getElementById('unified-index-input')?.addEventListener('change', (e) => {
                const newIndex = parseInt(e.target.value, 10);
                if (!isNaN(newIndex) && newIndex > 0) {
                    this.unifiedIndex = newIndex;
                    this.saveUnifiedIndex();
                    this.showTemporaryMessage(`世界书读写序号已更新为 ${newIndex}`);
                    // 如果自动开关是开启的，立即更新启用的条目
                    if (this.isAutoToggleLorebookEnabled) {
                        this.startAutoTogglePolling();
                    }
                } else {
                    e.target.value = this.unifiedIndex; // 如果输入无效，则恢复
                }
            });

           // 修复：小说模式序号输入框使用统一序号
           document.getElementById('novel-mode-index-input')?.addEventListener('change', (e) => {
               const newIndex = parseInt(e.target.value, 10);
               if (!isNaN(newIndex) && newIndex > 0) {
                   this.unifiedIndex = newIndex; // 修复：使用统一序号
                   this.saveUnifiedIndex(); // 修复：保存统一序号
                   this.showTemporaryMessage(`世界书读写序号已更新为 ${newIndex}`);
                   // 立即刷新模态框内容
                   if (document.getElementById('novel-mode-modal').style.display === 'flex') {
                     this.showNovelMode();
                   }
                   // 如果自动开关是开启的，立即更新启用的条目
                   if (this.isAutoToggleLorebookEnabled) {
                       this.startAutoTogglePolling();
                   }
               } else {
                   e.target.value = this.unifiedIndex; // 修复：如果输入无效，则恢复统一序号
               }
           });

            // 新增：为自动开关世界书复选框绑定监听
            document.getElementById('auto-toggle-lorebook-checkbox')?.addEventListener('change', (e) => {
                this.isAutoToggleLorebookEnabled = e.target.checked;
                this.saveAutoToggleState();
                this.showTemporaryMessage(`自动开关世界书已${this.isAutoToggleLorebookEnabled ? '开启' : '关闭'}`);
                if (this.isAutoToggleLorebookEnabled) {
                  this.startAutoTogglePolling();
                } else {
                  this.stopAutoTogglePolling();
                }
            });

            // 新增：世界书高级设置相关事件
            document.getElementById('toggle-worldbook-advanced')?.addEventListener('click', (e) => {
                e.preventDefault();
                const advancedSection = document.getElementById('worldbook-advanced-settings');
                const arrow = document.getElementById('worldbook-advanced-arrow');
                
                if (advancedSection.style.display === 'none') {
                    advancedSection.style.display = 'block';
                    arrow.textContent = '▼';
                } else {
                    advancedSection.style.display = 'none';
                    arrow.textContent = '▶';
                }
            });

            // 位置选择改变时启用/禁用深度输入
            const positionSelects = ['journey-position', 'past-lives-position', 'novel-position'];
            positionSelects.forEach(id => {
                document.getElementById(id)?.addEventListener('change', (e) => {
                    const depthInput = document.getElementById(id.replace('-position', '-depth'));
                    if (depthInput) {
                        if (e.target.value.startsWith('at_depth')) {
                            depthInput.disabled = false;
                        } else {
                            depthInput.disabled = true;
                        }
                    }
                });
            });

            // 保存世界书设置
            document.getElementById('save-worldbook-settings')?.addEventListener('click', () => {
                this.saveWorldbookSettings();
                this.showTemporaryMessage('世界书设置已保存');
            });

            // 恢复默认设置
            document.getElementById('reset-worldbook-settings')?.addEventListener('click', () => {
                this.resetWorldbookSettings();
                this.loadWorldbookSettings(); // 重新加载UI
                this.showTemporaryMessage('已恢复默认世界书设置');
            });

            document.getElementById('btn-inventory')?.addEventListener('click', () => this.showInventory());
            document.getElementById('btn-relationships')?.addEventListener('click', () => this.showRelationships());
            document.getElementById('btn-world-events')?.addEventListener('click', () => this.showWorldEvents());
            // document.getElementById('btn-variable-editor')?.addEventListener('click', () => this.showVariableEditor()); // 变量修改器已隐藏
            document.getElementById('btn-guixu-system')?.addEventListener('click', () => this.showGuixuSystem());
            document.getElementById('btn-guixu-space')?.addEventListener('click', () => this.showGuixuSpace());
            // 思维过程容器的点击事件改为header
            document.getElementById('thinking-process-header')?.addEventListener('click', () => this.toggleThinkingDisplay());
            document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
            document.getElementById('btn-reprocess-variables')?.addEventListener('click', () => this.reprocessVariables());
      
            document.getElementById('btn-gacha-system')?.addEventListener('click', () => this.showGachaSystem());
      
            // 小总结和大总结的事件监听器已被移除

            // 设置模态框内的按钮事件
            document.getElementById('btn-command-center-from-settings')?.addEventListener('click', () => {
              this.isFromSettingsModal = true; // 设置标志位
              this.showCommandCenter();
            });
            document.getElementById('btn-show-extracted-from-settings')?.addEventListener('click', () => {
              this.isFromSettingsModal = true; // 设置标志位
              this.showExtractedContent();
            });
            document.getElementById('btn-map-from-settings')?.addEventListener('click', () => {
              this.isFromSettingsModal = true; // 设置标志位
              this.showMap();
            });
            document.getElementById('background-settings-btn')?.addEventListener('click', () => {
              this.isFromSettingsModal = true; // 设置标志位
              this.showBackgroundSettings();
            });
            
            // 功能入口的世界书管理按钮事件监听器
            document.getElementById('btn-worldbook-manager-from-settings')?.addEventListener('click', () => {
              this.isFromSettingsModal = true; // 设置标志位
              this.showWorldbookManager();
            });

            // 新增：分段记忆按钮事件
            document.getElementById('btn-segmented-memory-from-settings')?.addEventListener('click', () => {
                this.isFromSettingsModal = true; // 设置标志位
                this.showSegmentedMemoryModal();
            });

            // 预设管理按钮事件监听器
            document.getElementById('btn-presets-manager')?.addEventListener('click', () => {
              this.showWorldbookPresets();
            });

            // 新增：为分段记忆预览的条目添加点击折叠/展开事件
            document.getElementById('segmented-memory-modal')?.addEventListener('click', (e) => {
                const header = e.target.closest('.summary-header');
                if (header) {
                    const details = header.nextElementSibling;
                    const arrow = header.querySelector('.summary-arrow');
                    if (details && details.classList.contains('summary-details')) {
                        if (details.style.display === 'none') {
                            details.style.display = 'block';
                            if(arrow) arrow.textContent = '▼';
                        } else {
                            details.style.display = 'none';
                            if(arrow) arrow.textContent = '▶';
                        }
                    }
                }
            });

            // 世界书管理界面的预设按钮事件监听器
            document.getElementById('worldbook-presets-btn')?.addEventListener('click', () => {
              this.isFromWorldbookManager = true; // 设置标志位
              this.showWorldbookPresets();
            });

            // 文字设置相关事件监听器
            // 文字颜色设置事件监听器
            document.getElementById('text-color-normal')?.addEventListener('change', (e) => {
              this.textSettings.colors.normal = e.target.value;
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('text-color-dialogue')?.addEventListener('change', (e) => {
              this.textSettings.colors.dialogue = e.target.value;
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('text-color-psychology')?.addEventListener('change', (e) => {
              this.textSettings.colors.psychology = e.target.value;
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('text-color-scenery')?.addEventListener('change', (e) => {
              this.textSettings.colors.scenery = e.target.value;
              this.applyTextSettings();
              this.saveTextSettings();
            });

            // 单独字体大小设置事件监听器
            document.getElementById('font-size-normal')?.addEventListener('input', (e) => {
              this.textSettings.fontSizes.normal = parseInt(e.target.value);
              document.getElementById('font-size-normal-value').textContent = e.target.value + 'px';
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('font-size-dialogue')?.addEventListener('input', (e) => {
              this.textSettings.fontSizes.dialogue = parseInt(e.target.value);
              document.getElementById('font-size-dialogue-value').textContent = e.target.value + 'px';
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('font-size-psychology')?.addEventListener('input', (e) => {
              this.textSettings.fontSizes.psychology = parseInt(e.target.value);
              document.getElementById('font-size-psychology-value').textContent = e.target.value + 'px';
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('font-size-scenery')?.addEventListener('input', (e) => {
              this.textSettings.fontSizes.scenery = parseInt(e.target.value);
              document.getElementById('font-size-scenery-value').textContent = e.target.value + 'px';
              this.applyTextSettings();
              this.saveTextSettings();
            });

            // 全局字体大小设置事件监听器
            document.getElementById('font-size-slider')?.addEventListener('input', (e) => {
              this.textSettings.fontSize = parseInt(e.target.value);
              document.getElementById('font-size-value').textContent = e.target.value + 'px';
              this.applyTextSettings();
              this.saveTextSettings();
            });
            document.getElementById('font-family-select')?.addEventListener('change', (e) => {
              if (e.target.value === 'upload_new') {
                // 触发文件选择
                document.getElementById('font-file-input').click();
                // 重置选择框到之前的值
                setTimeout(() => {
                  e.target.value = this.textSettings.fontFamily;
                }, 100);
              } else {
                // 应用选择的字体
                this.textSettings.fontFamily = e.target.value;
                // 确保自定义字体样式已加载
                this.ensureCustomFontLoaded(e.target.value).then(() => {
                  this.applyTextSettings();
                  this.saveTextSettings();
                });
                
                // 检查是否为自定义字体
                const isCustomFont = this.textSettings.customFonts.some(font => font.family === e.target.value);
                const fontName = isCustomFont ?
                  this.textSettings.customFonts.find(font => font.family === e.target.value).name :
                  e.target.options[e.target.selectedIndex].text;
                
                this.showTemporaryMessage(`已应用字体: ${fontName}`);
              }
            });
            document.getElementById('font-file-input')?.addEventListener('change', (e) => {
              this.handleFontUpload(e);
            });
            document.getElementById('reset-text-settings-btn')?.addEventListener('click', () => {
              this.resetTextSettings();
            });
            document.getElementById('preview-text-settings-btn')?.addEventListener('click', () => {
              this.previewTextSettings();
            });
            document.getElementById('font-compress-help-btn')?.addEventListener('click', () => {
              this.showFontCompressHelp();
            });
            // 主界面的世界线回顾按钮
            document.getElementById('btn-view-journey-main')?.addEventListener('click', () => this.showJourney());
            document.getElementById('btn-view-past-lives-main')?.addEventListener('click', () => this.showPastLives());
            document.getElementById('btn-save-load-manager')?.addEventListener('click', () => this.showSaveLoadManager());
            document.getElementById('btn-novel-mode')?.addEventListener('click', () => this.showNovelMode());
            document.getElementById('btn-clear-all-saves')?.addEventListener('click', () => this.clearAllSaves());

            // 新增：小说模式章节导航和书签事件监听器
            document.getElementById('chapter-select')?.addEventListener('change', (e) => {
              const chapterIndex = parseInt(e.target.value);
              if (!isNaN(chapterIndex)) {
                if (this.novelDisplayMode === 'single') {
                  this.showNovelChapter(chapterIndex);
                } else {
                  // 连贯模式下跳转到对应章节位置
                  const anchor = document.getElementById(`chapter-anchor-${chapterIndex}`);
                  if (anchor) {
                    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }
            });

            document.getElementById('prev-chapter-btn')?.addEventListener('click', () => this.prevChapter());
            document.getElementById('next-chapter-btn')?.addEventListener('click', () => this.nextChapter());
            document.getElementById('add-bookmark-btn')?.addEventListener('click', () => this.addNovelBookmark());
            document.getElementById('goto-bookmark-btn')?.addEventListener('click', () => this.gotoBookmark());
            document.getElementById('delete-bookmark-btn')?.addEventListener('click', () => this.deleteBookmark());
            document.getElementById('novel-background-btn')?.addEventListener('click', () => this.showNovelBackgroundSettings());

            // 显示模式切换事件监听器
            document.addEventListener('change', (e) => {
              if (e.target.name === 'novel-display-mode') {
                this.switchNovelDisplayMode(e.target.value);
              }
            });
            document.getElementById('btn-import-save')?.addEventListener('click', () => document.getElementById('import-file-input')?.click());
            document.getElementById('import-file-input')?.addEventListener('change', (e) => this.handleFileImport(e));
            // 时间线备份/恢复事件监听器已移除，功能已集成到存档系统中
 
              // 为写入世界书按钮绑定监听器
             document
              .getElementById('btn-write-journey')
              ?.addEventListener('click', () => this.writeJourneyToLorebook());
            document
              .getElementById('btn-write-past-lives')
              ?.addEventListener('click', () => this.writePastLivesToLorebook());
            document
              .getElementById('btn-write-novel-mode')
              ?.addEventListener('click', () => this.writeNovelModeToLorebook());

            document
              .getElementById('btn-write-character-card')
              ?.addEventListener('click', () => this.writeCharacterCardToLorebook());
            // 为自动写入复选框绑定监听器，并增加状态保存
            document.getElementById('btn-execute-map-commands')?.addEventListener('click', () => {
               if (this.lastExtractedMapCommands) {
                   this.handleMapUpdateCommand(this.lastExtractedMapCommands);
               } else {
                   this.showTemporaryMessage('没有可解析的地图指令。');
               }
            });
            const autoWriteCheckbox = document.getElementById('auto-write-checkbox');
            if (autoWriteCheckbox) {
              autoWriteCheckbox.addEventListener('change', e => {
                this.isAutoWriteEnabled = e.target.checked;
                this.saveAutoWriteState(this.isAutoWriteEnabled);
                this.showTemporaryMessage(`自动写入历程/涟漪已${this.isAutoWriteEnabled ? '开启' : '关闭'}`);
                if (this.isAutoWriteEnabled) {
                  this.startAutoWritePolling();
                } else {
                  this.stopAutoWritePolling();
                }
              });
            }

            // 为小说模式复选框绑定监听器
            const novelModeCheckbox = document.getElementById('novel-mode-enabled-checkbox');
            if (novelModeCheckbox) {
              novelModeCheckbox.addEventListener('change', e => {
                this.isNovelModeEnabled = e.target.checked;
                this.saveNovelModeState(this.isNovelModeEnabled);
                this.showTemporaryMessage(`小说模式自动写入已${this.isNovelModeEnabled ? '开启' : '关闭'}`);

                // 新逻辑：此开关只控制轮询，不触发UI刷新
                if (this.isNovelModeEnabled) {
                  this.startNovelModeAutoWritePolling();
                } else {
                  this.stopNovelModeAutoWritePolling();
                }

                // 手动更新标签文本以提供即时反馈
                const label = document.querySelector('label[for="novel-mode-enabled-checkbox"]');
                if (label) {
                  label.textContent = `开启小说模式`; // 恢复原始文本
                }
                // 刷新打开的模态框以更新按钮状态和提示
                if (document.getElementById('extracted-content-modal').style.display === 'flex') {
                  this.showExtractedContent();
                }
              });
            }

            // 指令中心按钮
            document
              .getElementById('btn-execute-commands')
              ?.addEventListener('click', () => this.executePendingActions());
            document.getElementById('btn-clear-commands')?.addEventListener('click', () => this.clearPendingActions());
            document.getElementById('btn-refresh-storage')?.addEventListener('click', () => this.refreshLocalStorage());
            document.getElementById('action-options-enabled-checkbox')?.addEventListener('change', (e) => {
                this.isActionOptionsEnabled = e.target.checked;
                this.saveActionOptionsState();
                this.showTemporaryMessage(`行动选项显示已${this.isActionOptionsEnabled ? '开启' : '关闭'}`);
                // 重新渲染行动选项以立即反映变化
                this.renderActionOptions(this._extractLastTagContent('行动选项', this.lastExtractedVariables || ''));
            });

            document.getElementById('auto-send-action-checkbox')?.addEventListener('change', (e) => {
               this.isActionAutoSend = e.target.checked;
               this.saveActionAutoSendState();
               this.showTemporaryMessage(`行动选项点击即发送已${this.isActionAutoSend ? '开启' : '关闭'}`);
            });

            document.getElementById('streaming-enabled-checkbox')?.addEventListener('change', (e) => {
                this.isStreamingEnabled = e.target.checked;
                this.saveStreamingState();
                this.showTemporaryMessage(`流式响应已${this.isStreamingEnabled ? '开启' : '关闭'}`);
            });

            document.getElementById('format-validation-enabled-checkbox')?.addEventListener('change', (e) => {
                this.isFormatValidationEnabled = e.target.checked;
                this.saveFormatValidationState();
                this.showTemporaryMessage(`格式审查已${this.isFormatValidationEnabled ? '开启' : '关闭'}`);
            });

            // 新增：为回车发送复选框绑定事件
            document.getElementById('enter-send-checkbox')?.addEventListener('change', (e) => {
                this.isEnterSendEnabled = e.target.checked;
                this.saveEnterSendState();
                this.showTemporaryMessage(`回车发送已${this.isEnterSendEnabled ? '开启' : '关闭'}`);
            });

            // 新增：为键盘快捷键复选框绑定事件
            document.getElementById('keyboard-shortcuts-checkbox')?.addEventListener('change', (e) => {
                this.isKeyboardShortcutsEnabled = e.target.checked;
                this.saveKeyboardShortcutsState();
                this.showTemporaryMessage(`键盘快捷键已${this.isKeyboardShortcutsEnabled ? '开启' : '关闭'}`);
            });

            // 新增：为手机输入框适配复选框绑定事件
            document.getElementById('mobile-input-adapt-checkbox')?.addEventListener('change', (e) => {
                this.isMobileInputAdaptEnabled = e.target.checked;
                this.saveMobileInputAdaptState();
                this.showTemporaryMessage(`手机输入框适配已${this.isMobileInputAdaptEnabled ? '开启' : '关闭'}`);
                
                // 如果关闭了适配，需要重置输入框位置
                if (!this.isMobileInputAdaptEnabled && this.floatingInputContainer) {
                    this.resetInputPosition();
                }
                
                // 重新初始化键盘处理逻辑
                this.reinitializeInputKeyboardHandling();
            });

            // 新增：为键盘快捷键三角按钮绑定点击事件
            document.getElementById('keyboard-shortcuts-toggle')?.addEventListener('click', () => {
                this.toggleKeyboardShortcutsDetails();
            });

            // 新增：为快速发送输入框绑定回车键事件
            document.getElementById('quick-send-input')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && this.isEnterSendEnabled) {
                    e.preventDefault(); // 阻止默认的换行行为
                    this.executeQuickSend();
                }
            });

            // 键盘处理初始化已移至状态加载完成后执行（延迟初始化）
            console.log('[归墟输入法] 键盘处理将在状态加载完成后初始化');

 
              document
                .querySelectorAll('.modal-close-btn')
                .forEach(btn => btn.addEventListener('click', (e) => this.handleModalClose(e)));
  
              // 新增：为人物关系面板的自定义关闭按钮添加委托事件
              // 使用事件委托确保动态添加的按钮也能被监听到
              document.body.addEventListener('click', (e) => {
                if (e.target.matches('.relationships-close-btn') && e.target.closest('#relationships-modal')) {
                    window.GuixuManager.closeModal('relationships-modal');
                }
              });

              // 新增：为输入缓存模态框的内容列表添加事件委托
              document.getElementById('input-cache-modal')?.addEventListener('click', e => {
                  if (e.target && e.target.closest('.input-cache-item')) {
                      const item = e.target.closest('.input-cache-item');
                      const content = item.dataset.content;
                      if (content) {
                          this.applyInputFromHistory(content);
                      }
                  }
              });
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
              overlay.addEventListener('click', e => {
                if (e.target === overlay) this.handleModalClose(e);
              });
            });

            // 事件委托：背包内的点击事件
            const inventoryModalBody = document.querySelector('#inventory-modal .modal-body');
            if (inventoryModalBody) {
              inventoryModalBody.addEventListener('click', e => {
                if (e.target.classList.contains('item-equip-btn')) {
                  const itemElement = e.target.closest('.inventory-item');
                  const itemData = JSON.parse(itemElement.dataset.itemDetails.replace(/'/g, "'") || '{}');
                  const category = itemElement.dataset.category;
                  // 新增：处理功法装备按钮
                  if (e.target.dataset.equipType === 'zhuxiu') {
                    this.equipItem(itemData, category, e.target, 'zhuxiuGongfa');
                  } else if (e.target.dataset.equipType === 'fuxiu') {
                    this.equipItem(itemData, category, e.target, 'fuxiuXinfa');
                  } else {
                    this.equipItem(itemData, category, e.target);
                  }
                } else if (e.target.classList.contains('item-use-btn')) {
                  const itemElement = e.target.closest('.inventory-item');
                  const itemData = JSON.parse(itemElement.dataset.itemDetails.replace(/'/g, "'") || '{}');
                  this.useItem(itemData, e.target);
                } else if (e.target.classList.contains('item-unequip-btn')) {
                  const slotId = e.target.dataset.slotId;
                  const slotElement = document.getElementById(slotId);
                  if (slotElement) {
                    this.unequipItem(slotId, slotElement, true, true); // 从背包卸载，需要刷新背包UI
                  }
                } else if (e.target.classList.contains('item-discard-btn')) {
                  const itemElement = e.target.closest('.inventory-item');
                  const itemData = JSON.parse(itemElement.dataset.itemDetails.replace(/'/g, "'") || '{}');
                  const category = itemElement.dataset.category;
                  this.discardItem(itemData, category, itemElement);
                }
              });
            }

            // 事件委托：左侧装备面板的事件
            const characterPanel = document.querySelector('.character-panel');
            if (characterPanel) {
              // 悬浮显示Tooltip
              characterPanel.addEventListener('mouseover', e => {
                const slot = e.target.closest('.equipment-slot');
                if (slot && slot.classList.contains('equipped')) {
                  this.showEquipmentTooltip(slot, e);
                }
              });
              characterPanel.addEventListener('mouseout', e => {
                const slot = e.target.closest('.equipment-slot');
                if (slot) {
                  this.hideEquipmentTooltip();
                }
              });
              // 点击卸载装备
              characterPanel.addEventListener('click', e => {
                const slot = e.target.closest('.equipment-slot');
                if (slot && slot.classList.contains('equipped')) {
                  this.unequipItem(slot.id, slot, true, false); // 从主面板卸载，不需要弹出背包
                }
              });
            }

            // 为快速发送按钮绑定事件
            document.getElementById('btn-quick-send')?.addEventListener('click', () => this.executeQuickSend());

            // --- 新增：为输入缓存绑定事件 ---
            document.getElementById('btn-show-cache')?.addEventListener('click', () => this.showInputCacheModal());

            // 新增：为行动选项容器绑定事件委托
            document.getElementById('action-options-container')?.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('action-option-btn')) {
                    const actionText = e.target.dataset.actionText;
                    if (actionText) {
                        if (this.isActionAutoSend) {
                            // 开启时，直接点击发送
                            this.handleAction(actionText);
                        } else {
                            // 关闭时，加入输入框
                            const input = document.getElementById('quick-send-input');
                            if (input) {
                                input.value = actionText;
                            }

             // --- 核心修改：在这里处理暂存的伙伴 ---
            // 此段逻辑已被移至handleJoinWorld中进行乐观更新，此处不再需要，故删除
            // if (this.pendingCompanionJoin) { ... }

            // 核心修复：统一处理所有已消耗的衍梦尘指令
            const consumedGachaActions = this.pendingActions.filter(cmd => cmd.action === 'acquire_item_talent' || cmd.action === 'join_world');
            if (consumedGachaActions.length > 0) {
                consumedGachaActions.forEach(cmd => {
                    if (cmd.action === 'join_world') {
                        // 角色加入 activeCompanions
                        if (!this.gachaState.activeCompanions.some(c => c.id === cmd.itemData.id)) {
                            this.gachaState.activeCompanions.push({ id: cmd.itemData.id, name: cmd.itemData.名称, rarity: cmd.itemData.稀有度 });
                        }
                    } else {
                        // 道具/天赋加入 activatedItems
                        if (!this.gachaState.activatedItems.includes(cmd.itemData.id)) {
                            this.gachaState.activatedItems.push(cmd.itemData.id);
                        }
                    }
                });
                this.saveGachaState(); // 在循环处理完所有项目后，统一保存一次状态
            }

            // --- 新增：修复伙伴列表不刷新的BUG ---
            if (document.getElementById('gacha-modal').style.display === 'flex') {
                this.renderSummonTab();
            }

                        }
                    }
                }
            });


            // 新增：为自动存档复选框绑定监听
            document.getElementById('auto-save-checkbox')?.addEventListener('change', (e) => {
                this.isAutoSaveEnabled = e.target.checked;
                this.saveAutoSaveState();
                this.showTemporaryMessage(`自动存档已${this.isAutoSaveEnabled ? '开启' : '关闭'}`);
            });

            // 新增：为自动化系统修剪模态框的按钮绑定事件
            document.getElementById('btn-confirm-trim')?.addEventListener('click', () => {
                const indexInput = document.getElementById('trim-journey-index-input');
                const index = indexInput ? parseInt(indexInput.value, 10) : this.unifiedIndex;
                if (!isNaN(index) && index > 0) {
                    this.trimJourneyAutomation(index);
                } else {
                    this.showTemporaryMessage('请输入有效的序号。');
                }
            });

            document.getElementById('btn-cancel-trim')?.addEventListener('click', () => {
                this.closeModal('trim-journey-modal');
            });

            // 新增：人物关系排序和亲密关系事件委托
            document.addEventListener('change', (e) => {
              if (e.target && e.target.id === 'relationship-sort') {
                this.handleRelationshipSort(e.target.value);
              }
            });

            document.addEventListener('click', (e) => {
              // 处理标签页点击
              if (e.target && e.target.closest('.tab-btn')) {
                const tabBtn = e.target.closest('.tab-btn');
                const tabType = tabBtn.dataset.tab;
                if (tabType) {
                  this.handleTabClick(tabType);
                }
              }
              
              // 处理亲密关系切换按钮（保留兼容性）
              if (e.target && e.target.id === 'toggle-intimate-mode') {
                this.toggleIntimateMode();
              }
              
              // 处理人物名字三连击 - 只允许点击名字触发亲密关系
              if (e.target && e.target.closest('.character-name')) {
                const nameElement = e.target.closest('.character-name');
                const card = nameElement.closest('.relationship-card');
                const characterName = card ? card.dataset.characterName : null;
                if (characterName) {
                  this.handleTripleClick(characterName, e);
                }
              }
            });

            // 新增：绑定键盘快捷键
            this.bindKeyboardShortcuts();

            this.listenersBound = true; // 设置标志位，确保此代码块只运行一次


            // 新增：为存档/读档模态框添加统一的事件委托
            const saveLoadModalBody = document.querySelector('#save-load-modal .modal-body');
            if (saveLoadModalBody) {
                saveLoadModalBody.addEventListener('click', (e) => {
                    const target = e.target;
                    const slotDiv = target.closest('.save-slot');
                    if (!slotDiv) return;

                    const slotId = slotDiv.dataset.slotId;
                    if (!slotId) return;

                    if (target.classList.contains('btn-save-slot')) {
                        this.saveGame(slotId);
                    } else if (target.classList.contains('btn-load-slot')) {
                        this.loadGame(slotId);
                    } else if (target.classList.contains('btn-delete-slot')) {
                        this.deleteSave(slotId);
                    } else if (target.classList.contains('btn-export-slot')) {
                        this.exportSave(slotId);
                    }
                });
            }
 
            // 绑定背景图设置模态框中的静态事件
            this.bindBackgroundSettingsListeners();
          },
 
            // --- Modal Control ---
           showSettings() {
             this.openModal('settings-modal');
             // 初始化透明度滑块
             this.initOpacitySlider();
             // 初始化文字设置UI
             this.updateTextSettingsUI();
             this.updateCustomFontsList();
             // 确保当前字体样式立即生效
             this.applyTextSettings();
             // 初始化世界书控制状态
             this.initWorldbookControlsInSettings();
           },

           // 新增：初始化透明度滑块
           initOpacitySlider() {
             const slider = document.getElementById('opacity-slider');
             const valueDisplay = document.getElementById('opacity-value');
             
             if (slider && valueDisplay) {
               // 设置当前值
               slider.value = this.mainOpacity;
               valueDisplay.textContent = `当前设置: ${this.mainOpacity}%`;
               
               // 绑定事件监听器
               slider.addEventListener('input', (e) => {
                 this.updateOpacity(parseInt(e.target.value));
               });
             }
           },

           // 新增：更新透明度
           updateOpacity(value) {
             this.mainOpacity = value;
             const valueDisplay = document.getElementById('opacity-value');
             if (valueDisplay) {
               valueDisplay.textContent = `当前设置: ${value}%`;
             }
             
             // 应用透明度到主界面
             this.applyOpacityToMainInterface(value);
             
             // 保存设置
             this.saveOpacitySettings();
           },

           // 新增：应用透明度到主界面
           applyOpacityToMainInterface(opacity) {
             // 将透明度值转换为0-1的范围
             const opacityValue = opacity / 100;
             
             // 通过动态创建CSS规则来控制伪元素的透明度
             let styleElement = document.getElementById('dynamic-overlay-style');
             if (!styleElement) {
               styleElement = document.createElement('style');
               styleElement.id = 'dynamic-overlay-style';
               document.head.appendChild(styleElement);
             }
             
             // 创建CSS规则来控制伪元素的透明度
             styleElement.textContent = `
               .guixu-root-container::before {
                 content: '';
                 position: absolute;
                 top: 0;
                 left: 0;
                 width: 100%;
                 height: 100%;
                 background: rgba(26, 26, 46, ${opacityValue}) !important;
                 pointer-events: none;
                 z-index: -1;
               }
             `;
             
             console.log(`[归墟透明度] 设置覆盖层透明度为: ${opacityValue}`);
           },

           // 新增：保存透明度设置
           saveOpacitySettings() {
             try {
               localStorage.setItem('guixu_main_opacity', this.mainOpacity.toString());
             } catch (e) {
               console.error('保存透明度设置失败:', e);
             }
           },

           // 新增：加载透明度设置
           loadOpacitySettings() {
             try {
               const saved = localStorage.getItem('guixu_main_opacity');
               if (saved) {
                 this.mainOpacity = parseInt(saved);
                 this.applyOpacityToMainInterface(this.mainOpacity);
               }
             } catch (e) {
               console.error('加载透明度设置失败:', e);
               this.mainOpacity = 100; // 默认值
             }
           },

           // --- 新增：文字设置相关函数 ---
           // 应用文字设置到页面
           async applyTextSettings() {
             try {
               // 确保自定义字体的CSS样式存在
               await this.ensureCustomFontsLoaded();
               
               // 优化性能：查找现有样式标签，如果不存在则创建，否则直接更新内容
               let style = document.getElementById('guixu-text-settings-style');
               if (!style) {
                 style = document.createElement('style');
                 style.id = 'guixu-text-settings-style';
                 document.head.appendChild(style);
               }
               
               style.textContent = `
                 .game-text-container {
                   color: ${this.textSettings.colors.normal} !important;
                   font-size: ${this.textSettings.fontSizes?.normal || this.textSettings.fontSize}px !important;
                   font-family: ${this.textSettings.fontFamily} !important;
                 }
                 .text-language {
                   color: ${this.textSettings.colors.dialogue} !important;
                   font-size: ${this.textSettings.fontSizes?.dialogue || this.textSettings.fontSize}px !important;
                   font-style: italic;
                 }
                 .text-psychology {
                   color: ${this.textSettings.colors.psychology} !important;
                   font-size: ${this.textSettings.fontSizes?.psychology || this.textSettings.fontSize}px !important;
                   font-style: italic;
                   opacity: 0.8;
                 }
                 .text-scenery {
                   color: ${this.textSettings.colors.scenery} !important;
                   font-size: ${this.textSettings.fontSizes?.scenery || this.textSettings.fontSize}px !important;
                 }
                 /* 确保正文内容使用正确的字体大小 - 修复正文字体大小无法调节的问题 */
                 .game-text-container,
                 .game-text-container > *:not(.text-language):not(.text-psychology):not(.text-scenery),
                 .game-text-container p,
                 .game-text-container div:not([class*="text-"]) {
                   font-size: ${this.textSettings.fontSizes?.normal || this.textSettings.fontSize}px !important;
                 }
               `;
               
               // 强制刷新页面上的文字显示
               this.refreshTextDisplay();
               
               console.log('[归墟文字设置] 已应用文字设置，当前字体:', this.textSettings.fontFamily);
             } catch (e) {
               console.error('应用文字设置失败:', e);
             }
           },

           // 确保自定义字体已加载
           async ensureCustomFontsLoaded() {
             try {
               const loadPromises = this.textSettings.customFonts.map(async (font) => {
                 const existingStyle = document.getElementById(`font-style-${font.hash}`);
                 if (!existingStyle && font.cacheKey) {
                   try {
                     // 如果字体样式不存在，尝试从缓存重新加载
                     const cachedFont = await this.loadFontFromIndexedDB(font.cacheKey);
                     const style = document.createElement('style');
                     style.id = `font-style-${font.hash}`;
                     style.textContent = `
                       @font-face {
                         font-family: ${font.family};
                         src: url(${cachedFont.data});
                         font-display: swap;
                       }
                     `;
                     document.head.appendChild(style);
                     console.log('[归墟文字设置] 重新加载字体样式:', font.name);
                     return true;
                   } catch (error) {
                     console.warn('[归墟文字设置] 无法重新加载字体:', font.name, error);
                     return false;
                   }
                 }
                 return true;
               });
               
               await Promise.all(loadPromises);
               console.log('[归墟文字设置] 所有自定义字体检查完成');
             } catch (e) {
               console.error('确保自定义字体加载失败:', e);
             }
           },

           // 强制刷新文字显示
           refreshTextDisplay() {
             try {
               // 找到所有文字容器并强制重新渲染
               const textContainers = document.querySelectorAll('.game-text-container');
               textContainers.forEach(container => {
                 // 触发重新渲染
                 const display = container.style.display;
                 container.style.display = 'none';
                 container.offsetHeight; // 强制重排
                 container.style.display = display;
               });

               // 刷新所有文字样式元素
               const textElements = document.querySelectorAll('.text-language, .text-psychology, .text-scenery');
               textElements.forEach(element => {
                 // 强制重新应用样式
                 const className = element.className;
                 element.className = '';
                 element.offsetHeight; // 强制重排
                 element.className = className;
               });

               console.log('[归墟文字设置] 已刷新文字显示');
             } catch (e) {
               console.error('刷新文字显示失败:', e);
             }
           },

           // 保存文字设置
           saveTextSettings() {
             try {
               localStorage.setItem('guixu_text_settings', JSON.stringify(this.textSettings));
               console.log('[归墟文字设置] 已保存文字设置');
             } catch (e) {
               console.error('保存文字设置失败:', e);
             }
           },

           // 加载文字设置
           loadTextSettings() {
             try {
               const saved = localStorage.getItem('guixu_text_settings');
               if (saved) {
                 const settings = JSON.parse(saved);
                 this.textSettings = { ...this.textSettings, ...settings };

                 // 加载并应用自定义字体（从IndexedDB缓存）
                 if (this.textSettings.customFonts && this.textSettings.customFonts.length > 0) {
                   // 使用Promise.all确保所有字体都加载完成
                   const fontLoadPromises = this.textSettings.customFonts.map(async (font) => {
                     try {
                       if (font.cacheKey) {
                         // 新版本：从IndexedDB加载
                         const cachedFont = await this.loadFontFromIndexedDB(font.cacheKey);
                         
                         // 移除可能存在的旧样式
                         const oldStyle = document.getElementById(`font-style-${font.hash}`);
                         if (oldStyle) {
                           oldStyle.remove();
                         }
                         
                         const style = document.createElement('style');
                         style.id = `font-style-${font.hash}`;
                         style.textContent = `
                           @font-face {
                             font-family: ${font.family};
                             src: url(${cachedFont.data});
                             font-display: swap;
                           }
                         `;
                         document.head.appendChild(style);
                         console.log(`[归墟文字设置] 已从缓存加载字体: ${font.name}`);
                         return true;
                       } else if (font.data) {
                         // 旧版本兼容：直接使用保存的数据
                         const style = document.createElement('style');
                         style.id = `font-style-${font.hash || 'legacy'}`;
                         style.textContent = `
                           @font-face {
                             font-family: ${font.family};
                             src: url(${font.data});
                             font-display: swap;
                           }
                         `;
                         document.head.appendChild(style);
                         console.log(`[归墟文字设置] 已加载字体（兼容模式）: ${font.name}`);
                         return true;
                       }
                     } catch (error) {
                       console.warn(`[归墟文字设置] 无法加载字体 ${font.name}:`, error);
                       return false;
                     }
                   });

                   // 等待所有字体加载完成后再应用设置
                   Promise.all(fontLoadPromises).then((results) => {
                     // 移除加载失败的字体
                     this.textSettings.customFonts = this.textSettings.customFonts.filter((font, index) => results[index]);
                     
                     // 应用文字设置
                     this.updateTextSettingsUI();
                     this.applyTextSettings();
                     console.log('[归墟文字设置] 所有字体加载完成，已应用设置');
                   });
                 } else {
                   // 没有自定义字体，直接应用设置
                   this.updateTextSettingsUI();
                   this.applyTextSettings();
                 }
               } else {
                 // 没有保存的设置，使用默认设置
                 this.updateTextSettingsUI();
                 this.applyTextSettings();
               }
               console.log('[归墟文字设置] 已加载文字设置');
             } catch (e) {
               console.error('加载文字设置失败:', e);
               // 出错时也要应用默认设置
               this.updateTextSettingsUI();
               this.applyTextSettings();
             }
           },

           // 更新文字设置UI
           updateTextSettingsUI() {
             try {
               const normalInput = document.getElementById('text-color-normal');
               const dialogueInput = document.getElementById('text-color-dialogue');
               const psychologyInput = document.getElementById('text-color-psychology');
               const sceneryInput = document.getElementById('text-color-scenery');
               const fontSizeSlider = document.getElementById('font-size-slider');
               const fontSizeValue = document.getElementById('font-size-value');
               const fontFamilySelect = document.getElementById('font-family-select');

               if (normalInput) normalInput.value = this.textSettings.colors.normal;
               if (dialogueInput) dialogueInput.value = this.textSettings.colors.dialogue;
               if (psychologyInput) psychologyInput.value = this.textSettings.colors.psychology;
               if (sceneryInput) sceneryInput.value = this.textSettings.colors.scenery;
               if (fontSizeSlider) fontSizeSlider.value = this.textSettings.fontSize;
               if (fontSizeValue) fontSizeValue.textContent = this.textSettings.fontSize + 'px';
               
               if (fontFamilySelect) {
                 // 更新字体选择下拉框，包含自定义字体
                 this.updateFontFamilyOptions();
                 fontFamilySelect.value = this.textSettings.fontFamily;
               }
             } catch (e) {
               console.error('更新文字设置UI失败:', e);
             }
           },

           // 新增：初始化设置界面中的世界书控制状态
           initWorldbookControlsInSettings() {
             try {
               // 初始化统一序号输入框
               const unifiedIndexInput = document.getElementById('unified-index-input');
               if (unifiedIndexInput) {
                 unifiedIndexInput.value = this.unifiedIndex;
               }

               // 初始化自动开关世界书复选框
               const autoToggleCheckbox = document.getElementById('auto-toggle-lorebook-checkbox');
               if (autoToggleCheckbox) {
                 autoToggleCheckbox.checked = this.isAutoToggleLorebookEnabled;
               }

               // 初始化预设显示
               this.updatePresetsInSettings();

               console.log('[归墟设置] 已初始化世界书控制状态');
             } catch (e) {
               console.error('初始化世界书控制状态失败:', e);
             }
           },

           // 更新字体选择下拉框选项
           updateFontFamilyOptions() {
             const fontFamilySelect = document.getElementById('font-family-select');
             if (!fontFamilySelect) return;

             // 保存当前选择的值
             const currentValue = fontFamilySelect.value;

             // 清空现有选项
             fontFamilySelect.innerHTML = '';

             // 添加预设字体选项
             const presetFonts = [
               { value: "'ZCOOL+KuaiLe', 'Ma+Shan+Zheng', serif", text: "默认字体" },
               { value: "'Microsoft YaHei', sans-serif", text: "微软雅黑" },
               { value: "'SimSun', serif", text: "宋体" },
               { value: "'KaiTi', serif", text: "楷体" },
               { value: "'FangSong', serif", text: "仿宋" },
               { value: "'Arial', sans-serif", text: "Arial" },
               { value: "'Times New Roman', serif", text: "Times New Roman" }
             ];

             presetFonts.forEach(font => {
               const option = document.createElement('option');
               option.value = font.value;
               option.textContent = font.text;
               fontFamilySelect.appendChild(option);
             });

             // 添加分隔线（如果有自定义字体）
             if (this.textSettings.customFonts.length > 0) {
               const separator = document.createElement('option');
               separator.disabled = true;
               separator.textContent = '--- 自定义字体 ---';
               fontFamilySelect.appendChild(separator);

               // 添加自定义字体选项
               this.textSettings.customFonts.forEach(font => {
                 const option = document.createElement('option');
                 option.value = font.family;
                 option.textContent = font.name;
                 fontFamilySelect.appendChild(option);
               });
             }

             // 添加上传新字体选项
             const uploadOption = document.createElement('option');
             uploadOption.value = 'upload_new';
             uploadOption.textContent = '+ 上传新字体';
             fontFamilySelect.appendChild(uploadOption);

             // 恢复之前的选择
             if (currentValue && currentValue !== 'upload_new') {
               fontFamilySelect.value = currentValue;
             }
           },

           // 重置文字设置
           resetTextSettings() {
             this.textSettings = {
               colors: {
                 normal: '#e8dcc6',
                 dialogue: '#ff1493',
                 psychology: '#808080',
                 scenery: '#98fb98'
               },
               fontSize: 14,
               fontFamily: "'ZCOOL+KuaiLe', 'Ma+Shan+Zheng', serif",
               customFonts: []
             };
             this.updateTextSettingsUI();
             this.applyTextSettings();
             this.saveTextSettings();
             this.showTemporaryMessage('文字设置已重置为默认值');
           },

           // 预览文字设置效果
           previewTextSettings() {
             const previewText = `
               <div style="padding: 15px; background: rgba(0,0,0,0.8); border: 1px solid #c9aa71; border-radius: 5px; margin: 10px 0;">
                 <div style="color: #c9aa71; font-size: 14px; margin-bottom: 10px;">文字效果预览：</div>
                 <div class="text-language">这是对话文字的效果预览</div>
                 <div class="text-psychology">这是心理活动文字的效果预览</div>
                 <div class="text-scenery">这是景物描写文字的效果预览</div>
               </div>
             `;
             
             // 创建预览模态框
             const modal = document.createElement('div');
             modal.className = 'modal-overlay';
             modal.style.display = 'flex';
             modal.style.zIndex = '2002';
             modal.innerHTML = `
               <div class="modal-content" style="max-width: 500px;">
                 <div class="modal-header">
                   <h2 class="modal-title">文字效果预览</h2>
                   <button class="modal-close-btn">&times;</button>
                 </div>
                 <div class="modal-body">
                   ${previewText}
                   <div style="text-align: center; margin-top: 15px;">
                     <button class="interaction-btn" onclick="this.closest('.modal-overlay').remove()">关闭预览</button>
                   </div>
                 </div>
               </div>
             `;
             
             document.body.appendChild(modal);
             
             // 绑定关闭事件
             modal.querySelector('.modal-close-btn').addEventListener('click', () => {
               modal.remove();
             });
             modal.addEventListener('click', (e) => {
               if (e.target === modal) modal.remove();
             });
           },

           // 显示字体压缩帮助
           showFontCompressHelp() {
             const helpContent = `
               <div style="padding: 15px; line-height: 1.6;">
                 <h3 style="color: #c9aa71; margin-bottom: 15px;">字体文件压缩指南</h3>
                 
                 <div style="margin-bottom: 15px;">
                   <h4 style="color: #e0dcd1; margin-bottom: 8px;">推荐在线工具：</h4>
                   <ul style="color: #a09c91; margin-left: 20px;">
                     <li><strong>FontSquirrel Webfont Generator</strong><br>
                         网址：fontsquirrel.com/tools/webfont-generator<br>
                         支持TTF转WOFF2，压缩率高</li>
                     <li><strong>CloudConvert</strong><br>
                         网址：cloudconvert.com<br>
                         支持多种字体格式转换</li>
                     <li><strong>Convertio</strong><br>
                         网址：convertio.co<br>
                         简单易用的在线转换工具</li>
                   </ul>
                 </div>
                 
                 <div style="margin-bottom: 15px;">
                   <h4 style="color: #e0dcd1; margin-bottom: 8px;">压缩建议：</h4>
                   <ul style="color: #a09c91; margin-left: 20px;">
                     <li>优先选择WOFF2格式（压缩率最高）</li>
                     <li>移除不需要的字符集（如只保留中文+英文）</li>
                     <li>降低字体精度（适当减少曲线点数）</li>
                     <li>移除字体提示信息和元数据</li>
                   </ul>
                 </div>
                 
                 <div style="background: rgba(139, 115, 85, 0.2); padding: 10px; border-radius: 5px; margin-top: 15px;">
                   <div style="color: #c9aa71; font-size: 12px;">
                     <strong>提示：</strong>如果字体仍然过大，建议选择系统预设字体或寻找更轻量的替代字体。
                   </div>
                 </div>
               </div>
             `;
             
             // 创建帮助模态框
             const modal = document.createElement('div');
             modal.className = 'modal-overlay';
             modal.style.display = 'flex';
             modal.style.zIndex = '2002';
             modal.innerHTML = `
               <div class="modal-content" style="max-width: 600px;">
                 <div class="modal-header">
                   <h2 class="modal-title">字体压缩帮助</h2>
                   <button class="modal-close-btn">&times;</button>
                 </div>
                 <div class="modal-body">
                   ${helpContent}
                   <div style="text-align: center; margin-top: 20px;">
                     <button class="interaction-btn" onclick="this.closest('.modal-overlay').remove()">关闭</button>
                   </div>
                 </div>
               </div>
             `;
             
             document.body.appendChild(modal);
             
             // 绑定关闭事件
             modal.querySelector('.modal-close-btn').addEventListener('click', () => {
               modal.remove();
             });
             modal.addEventListener('click', (e) => {
               if (e.target === modal) modal.remove();
             });
           },

           // 处理字体文件上传
           handleFontUpload(event) {
             const file = event.target.files[0];
             if (!file) return;

             // 重置文件输入框，允许重新选择相同文件
             event.target.value = '';

             const allowedTypes = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2'];
             const fileExtension = file.name.split('.').pop().toLowerCase();
             const allowedExtensions = ['ttf', 'otf', 'woff', 'woff2'];

             if (!allowedExtensions.includes(fileExtension)) {
               this.showTemporaryMessage('请选择有效的字体文件 (.ttf, .otf, .woff, .woff2)');
               return;
             }

             // 检查文件大小（限制为10MB，但给出警告）
             if (file.size > 10 * 1024 * 1024) {
               this.showTemporaryMessage('字体文件过大，请选择小于10MB的文件');
               return;
             }
             
             // 对于大于2MB的文件给出警告
             if (file.size > 2 * 1024 * 1024) {
               const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
               const shouldContinue = confirm(`字体文件较大 (${sizeMB}MB)，可能影响加载速度和存储空间。是否继续上传？`);
               if (!shouldContinue) {
                 this.showTemporaryMessage('上传已取消');
                 return;
               }
               this.showTemporaryMessage(`正在上传大字体文件 (${sizeMB}MB)，请稍候...`);
             }

             // 显示上传开始提示
             this.showTemporaryMessage(`正在处理字体文件: ${file.name}`);

             const reader = new FileReader();
             
             reader.onload = (e) => {
               try {
                 const fontData = e.target.result;
                 const fontName = file.name.replace(/\.[^/.]+$/, ""); // 移除扩展名
                 const fontFamily = `'${fontName}'`;
                 
                 // 检查是否已存在同名字体
                 const existingFont = this.textSettings.customFonts.find(f => f.name === fontName);
                 if (existingFont) {
                   const shouldReplace = confirm(`字体 "${fontName}" 已存在，是否替换？`);
                   if (!shouldReplace) {
                     this.showTemporaryMessage('上传已取消');
                     return;
                   }
                   // 移除旧字体
                   const index = this.textSettings.customFonts.indexOf(existingFont);
                   this.removeCustomFont(index);
                 }
                 
                 // 生成字体文件的哈希值作为缓存键
                 const fontHash = this.generateFontHash(fontName, file.size, file.lastModified);
                 const cacheKey = `guixu_font_${fontHash}`;

                 // 使用IndexedDB存储字体文件
                 this.storeFontInIndexedDB(cacheKey, fontData, fontName, fontFamily)
                   .then(() => {
                     // 创建字体样式
                     const style = document.createElement('style');
                     style.id = `font-style-${fontHash}`;
                     style.textContent = `
                       @font-face {
                         font-family: ${fontFamily};
                         src: url(${fontData});
                         font-display: swap;
                       }
                     `;
                     document.head.appendChild(style);

                     // 添加到自定义字体列表（只保存元数据，不保存文件数据）
                     const customFont = {
                       name: fontName,
                       family: fontFamily,
                       hash: fontHash,
                       cacheKey: cacheKey,
                       size: file.size,
                       lastModified: file.lastModified
                     };
                     
                     this.textSettings.customFonts.push(customFont);
                     this.updateCustomFontsList();
                     
                     // 更新字体选择下拉框
                     this.updateFontFamilyOptions();
                     
                     // 自动应用新上传的字体
                     this.textSettings.fontFamily = fontFamily;
                     const fontFamilySelect = document.getElementById('font-family-select');
                     if (fontFamilySelect) {
                       fontFamilySelect.value = fontFamily;
                     }
                     this.applyTextSettings();
                     this.saveTextSettings();
                     
                     const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                     this.showTemporaryMessage(`字体 "${fontName}" (${sizeMB}MB) 上传成功并已应用`);
                   })
                   .catch(error => {
                     console.error('字体缓存失败:', error);
                     this.showTemporaryMessage(`字体缓存失败: ${error.message}`);
                     
                     // 即使缓存失败，也创建临时样式
                     const style = document.createElement('style');
                     style.textContent = `
                       @font-face {
                         font-family: ${fontFamily};
                         src: url(${fontData});
                         font-display: swap;
                       }
                     `;
                     document.head.appendChild(style);
                     
                     // 添加临时字体到列表（不保存到localStorage）
                     const tempFont = {
                       name: fontName + ' (临时)',
                       family: fontFamily,
                       hash: fontHash,
                       size: file.size,
                       temporary: true
                     };
                     this.textSettings.customFonts.push(tempFont);
                     this.updateCustomFontsList();
                   });
               } catch (error) {
                 console.error('字体处理失败:', error);
                 this.showTemporaryMessage(`字体处理失败: ${error.message}`);
               }
             };
             
             reader.onerror = (error) => {
               console.error('文件读取失败:', error);
               this.showTemporaryMessage('文件读取失败，请重试');
             };
             
             reader.readAsDataURL(file);
           },

           // 生成字体文件哈希值
           generateFontHash(name, size, lastModified) {
             const str = `${name}_${size}_${lastModified}`;
             let hash = 0;
             for (let i = 0; i < str.length; i++) {
               const char = str.charCodeAt(i);
               hash = ((hash << 5) - hash) + char;
               hash = hash & hash; // 转换为32位整数
             }
             return Math.abs(hash).toString(36);
           },

           // 使用IndexedDB存储字体文件
           // --- IndexedDB 统一管理 ---
           initDB() {
               if (this.db) {
                   return Promise.resolve(this.db);
               }
               if (this.dbPromise) {
                   return this.dbPromise;
               }

               this.dbPromise = new Promise((resolve, reject) => {
                   const request = indexedDB.open('GuixuDB', 3);

                   request.onerror = () => {
                       console.error('IndexedDB打开失败:', request.error);
                       this.dbPromise = null; // 重置以便重试
                       reject(request.error);
                   };

                   request.onupgradeneeded = (event) => {
                       console.log('IndexedDB升级中...');
                       const db = event.target.result;

                       if (!db.objectStoreNames.contains('fonts')) {
                           const fontStore = db.createObjectStore('fonts', { keyPath: 'cacheKey' });
                           fontStore.createIndex('name', 'name', { unique: false });
                           fontStore.createIndex('timestamp', 'timestamp', { unique: false });
                           console.log('对象存储 fonts 创建成功');
                       }

                       if (!db.objectStoreNames.contains('character_avatars')) {
                           const avatarStore = db.createObjectStore('character_avatars', { keyPath: 'characterName' });
                           avatarStore.createIndex('timestamp', 'timestamp', { unique: false });
                           console.log('对象存储 character_avatars 创建成功');
                       }
                   };

                   request.onsuccess = (event) => {
                       console.log('IndexedDB打开成功');
                       this.db = event.target.result;
                       this.dbPromise = null;
                       resolve(this.db);
                   };
               });
               return this.dbPromise;
           },

           async storeFontInIndexedDB(cacheKey, fontData, fontName, fontFamily) {
               try {
                   const db = await this.initDB();
                   const transaction = db.transaction(['fonts'], 'readwrite');
                   const store = transaction.objectStore('fonts');
                   const fontRecord = {
                       cacheKey: cacheKey,
                       name: fontName,
                       family: fontFamily,
                       data: fontData,
                       timestamp: Date.now()
                   };
                   const request = store.put(fontRecord);
                   return new Promise((resolve, reject) => {
                       request.onsuccess = () => {
                           console.log('字体缓存成功:', fontName);
                           resolve();
                       };
                       request.onerror = () => {
                           console.error('字体缓存失败:', request.error);
                           reject(request.error);
                       };
                   });
               } catch (error) {
                   console.error('IndexedDB操作异常:', error);
                   throw error;
               }
           },

           // 从IndexedDB加载字体文件
           async loadFontFromIndexedDB(cacheKey) {
             return new Promise((resolve, reject) => {
               const request = indexedDB.open('GuixuDB', 3);
               
               request.onerror = () => {
                 console.error('IndexedDB打开失败:', request.error);
                 reject(request.error);
               };
               
               request.onupgradeneeded = (event) => {
                   console.log('IndexedDB升级中 (from loadFont)...');
                   const db = event.target.result;

                   if (!db.objectStoreNames.contains('fonts')) {
                       const fontStore = db.createObjectStore('fonts', { keyPath: 'cacheKey' });
                       fontStore.createIndex('name', 'name', { unique: false });
                       fontStore.createIndex('timestamp', 'timestamp', { unique: false });
                       console.log('对象存储 fonts 创建成功');
                   }

                   if (!db.objectStoreNames.contains('character_avatars')) {
                       const avatarStore = db.createObjectStore('character_avatars', { keyPath: 'characterName' });
                       avatarStore.createIndex('timestamp', 'timestamp', { unique: false });
                       console.log('对象存储 character_avatars 创建成功');
                   }
               };
               
               request.onsuccess = (event) => {
                 const db = event.target.result;
                 
                 try {
                   // 检查对象存储是否存在
                   if (!db.objectStoreNames.contains('fonts')) {
                     console.warn('fonts对象存储不存在，字体缓存为空');
                     db.close();
                     reject(new Error('fonts对象存储不存在'));
                     return;
                   }
                   
                   const transaction = db.transaction(['fonts'], 'readonly');
                   const store = transaction.objectStore('fonts');
                   
                   const getRequest = store.get(cacheKey);
                   getRequest.onsuccess = () => {
                     if (getRequest.result) {
                       console.log('字体缓存加载成功:', getRequest.result.name);
                       resolve(getRequest.result);
                     } else {
                       console.warn('字体缓存未找到:', cacheKey);
                       reject(new Error('Font not found in cache'));
                     }
                   };
                   getRequest.onerror = () => {
                     console.error('字体缓存读取失败:', getRequest.error);
                     reject(getRequest.error);
                   };
                   
                   transaction.onerror = () => {
                     console.error('读取事务失败:', transaction.error);
                     reject(transaction.error);
                   };
                 } catch (error) {
                   console.error('IndexedDB读取异常:', error);
                   reject(error);
                 }
               };
             });
           },

           // 更新自定义字体列表显示
           updateCustomFontsList() {
             const container = document.getElementById('uploaded-fonts-list');
             if (!container) return;

             if (this.textSettings.customFonts.length === 0) {
               container.innerHTML = '<div style="color: #8b7355; font-size: 11px; text-align: center; padding: 10px;">暂无上传的字体</div>';
               return;
             }

             let html = '';
             this.textSettings.customFonts.forEach((font, index) => {
               html += `
                 <div style="display: flex; align-items: center; justify-content: space-between; padding: 5px; border: 1px solid #8b7355; border-radius: 3px; margin-bottom: 5px;">
                   <span style="font-size: 11px; color: #e0dcd1;">${font.name}</span>
                   <div>
                     <button class="interaction-btn font-use-btn" style="padding: 2px 6px; font-size: 10px; margin-right: 5px;" data-font-index="${index}">使用</button>
                     <button class="interaction-btn font-remove-btn" style="padding: 2px 6px; font-size: 10px; background: #8b0000; border-color: #ff6b6b;" data-font-index="${index}">删除</button>
                   </div>
                 </div>
               `;
             });
             
             container.innerHTML = html;

             // 绑定事件委托
             container.addEventListener('click', (e) => {
               const index = parseInt(e.target.dataset.fontIndex);
               if (isNaN(index)) return;

               if (e.target.classList.contains('font-use-btn')) {
                 this.useCustomFont(index);
               } else if (e.target.classList.contains('font-remove-btn')) {
                 this.removeCustomFont(index);
               }
             });
           },
            // 确保自定义字体已加载
            async ensureCustomFontLoaded(fontFamily) {
              // 检查是否是自定义字体
              const customFont = this.textSettings.customFonts.find(font => font.family === fontFamily);
              if (!customFont) {
                return; // 不是自定义字体，直接返回
              }

              // 检查字体样式是否已存在
              const existingStyle = document.getElementById(`font-style-${customFont.hash}`);
              if (existingStyle) {
                return; // 字体样式已存在，直接返回
              }

              // 字体样式不存在，需要重新加载
              if (customFont.cacheKey) {
                try {
                  const cachedFont = await this.loadFontFromIndexedDB(customFont.cacheKey);
                  const style = document.createElement('style');
                  style.id = `font-style-${customFont.hash}`;
                  style.textContent = `
                    @font-face {
                      font-family: '${cachedFont.name}';
                      src: url(data:font/truetype;base64,${cachedFont.data}) format('truetype');
                    }
                  `;
                  document.head.appendChild(style);
                  console.log('自定义字体重新加载成功:', cachedFont.name);
                } catch (error) {
                  console.error('自定义字体加载失败:', error);
                }
              }
            },


           // 使用自定义字体
           useCustomFont(index) {
             if (index >= 0 && index < this.textSettings.customFonts.length) {
               const font = this.textSettings.customFonts[index];
               this.textSettings.fontFamily = font.family;
               
               // 更新字体选择下拉框为对应的自定义字体
               const fontFamilySelect = document.getElementById('font-family-select');
               if (fontFamilySelect) {
                 fontFamilySelect.value = font.family;
               }
               if (customFontSection) {
                 customFontSection.style.display = 'block';
               }
               
               // 确保字体已加载后再应用
               this.ensureCustomFontLoaded(font.family).then(() => {
                 this.applyTextSettings();
                 this.saveTextSettings();
               });
               this.showTemporaryMessage(`已应用字体 "${font.name}"`);
               
               console.log('[归墟文字设置] 已应用自定义字体:', font.name, font.family);
             }
           },

           // 删除自定义字体
           removeCustomFont(index) {
             if (index >= 0 && index < this.textSettings.customFonts.length) {
               const font = this.textSettings.customFonts[index];
               this.showCustomConfirm(`确定要删除字体 "${font.name}" 吗？`, async () => {
                 try {
                   // 从IndexedDB中删除缓存的字体文件
                   if (font.cacheKey) {
                     await this.removeFontFromIndexedDB(font.cacheKey);
                   }
                   
                   // 移除页面中的字体样式
                   if (font.hash) {
                     const styleElement = document.getElementById(`font-style-${font.hash}`);
                     if (styleElement) {
                       styleElement.remove();
                     }
                   }
                   
                   // 检查当前是否正在使用被删除的字体
                   const isCurrentFont = this.textSettings.fontFamily === font.family;
                   
                   // 从设置中移除
                   this.textSettings.customFonts.splice(index, 1);
                   this.updateCustomFontsList();
                   
                   // 更新字体选择下拉框
                   this.updateFontFamilyOptions();
                   
                   // 如果删除的是当前使用的字体，切换到默认字体
                   if (isCurrentFont) {
                     this.textSettings.fontFamily = "'ZCOOL+KuaiLe', 'Ma+Shan+Zheng', serif";
                     const fontFamilySelect = document.getElementById('font-family-select');
                     if (fontFamilySelect) {
                       fontFamilySelect.value = this.textSettings.fontFamily;
                     }
                     this.applyTextSettings();
                   }
                   
                   this.saveTextSettings();
                   this.showTemporaryMessage(`字体 "${font.name}" 已删除`);
                 } catch (error) {
                   console.error('删除字体缓存失败:', error);
                   // 即使缓存删除失败，也要从设置中移除
                   this.textSettings.customFonts.splice(index, 1);
                   this.updateCustomFontsList();
                   this.updateFontFamilyOptions();
                   this.saveTextSettings();
                   this.showTemporaryMessage(`字体 "${font.name}" 已删除（缓存清理可能失败）`);
                 }
               });
             }
           },

           // 从IndexedDB中删除字体文件
           removeFontFromIndexedDB(cacheKey) {
             return new Promise((resolve, reject) => {
               const request = indexedDB.open('GuixuDB', 3);
               
               request.onerror = () => {
                 console.error('IndexedDB打开失败:', request.error);
                 reject(request.error);
               };
               
               request.onupgradeneeded = (event) => {
                   console.log('IndexedDB升级中 (from removeFont)...');
                   const db = event.target.result;

                   if (!db.objectStoreNames.contains('fonts')) {
                       const fontStore = db.createObjectStore('fonts', { keyPath: 'cacheKey' });
                       fontStore.createIndex('name', 'name', { unique: false });
                       fontStore.createIndex('timestamp', 'timestamp', { unique: false });
                       console.log('对象存储 fonts 创建成功');
                   }

                   if (!db.objectStoreNames.contains('character_avatars')) {
                       const avatarStore = db.createObjectStore('character_avatars', { keyPath: 'characterName' });
                       avatarStore.createIndex('timestamp', 'timestamp', { unique: false });
                       console.log('对象存储 character_avatars 创建成功');
                   }
               };
               
               request.onsuccess = (event) => {
                 const db = event.target.result;
                 
                 try {
                   // 检查对象存储是否存在
                   if (!db.objectStoreNames.contains('fonts')) {
                     console.warn('fonts对象存储不存在，无需删除');
                     resolve(); // 不存在就当作删除成功
                     return;
                   }
                   
                   const transaction = db.transaction(['fonts'], 'readwrite');
                   const store = transaction.objectStore('fonts');
                   
                   const deleteRequest = store.delete(cacheKey);
                   deleteRequest.onsuccess = () => {
                     console.log('字体缓存删除成功:', cacheKey);
                     resolve();
                   };
                   deleteRequest.onerror = () => {
                     console.error('字体缓存删除失败:', deleteRequest.error);
                     reject(deleteRequest.error);
                   };
                   
                   transaction.onerror = () => {
                     console.error('删除事务失败:', transaction.error);
                     reject(transaction.error);
                   };
                 } catch (error) {
                   console.error('IndexedDB删除异常:', error);
                   reject(error);
                 }
               };
             });
           },

           // --- 人物头像 IndexedDB 操作 ---
           async storeAvatarInDB(characterName, imageData, opacity) {
               try {
                   const db = await this.initDB();
                   const transaction = db.transaction(['character_avatars'], 'readwrite');
                   const store = transaction.objectStore('character_avatars');
                   
                   // 先获取现有记录
                   const existingRecord = await new Promise((resolve, reject) => {
                       const request = store.get(characterName);
                       request.onsuccess = () => resolve(request.result);
                       request.onerror = () => reject(request.error);
                   });

                   const avatarRecord = {
                       characterName: characterName,
                       imageData: imageData !== undefined ? imageData : existingRecord?.imageData,
                       opacity: opacity !== undefined ? opacity : existingRecord?.opacity ?? 1.0,
                       timestamp: Date.now()
                   };

                   const request = store.put(avatarRecord);
                   return new Promise((resolve, reject) => {
                       request.onsuccess = () => {
                           console.log(`角色头像 [${characterName}] 缓存成功`);
                           resolve();
                       };
                       request.onerror = () => {
                           console.error(`角色头像 [${characterName}] 缓存失败:`, request.error);
                           reject(request.error);
                       };
                   });
               } catch (error) {
                   console.error('IndexedDB (头像) 操作异常:', error);
                   throw error;
               }
           },

           async getAvatarFromDB(characterName) {
               try {
                   const db = await this.initDB();
                   const transaction = db.transaction(['character_avatars'], 'readonly');
                   const store = transaction.objectStore('character_avatars');
                   const request = store.get(characterName);
                   return new Promise((resolve, reject) => {
                       request.onsuccess = () => {
                           if (request.result) {
                               resolve(request.result);
                           } else {
                               resolve(null); // 明确返回null
                           }
                       };
                       request.onerror = () => {
                           console.error(`读取角色头像 [${characterName}] 失败:`, request.error);
                           reject(request.error);
                       };
                   });
               } catch (error) {
                   // 如果数据库初始化失败等，直接返回null
                   console.error('IndexedDB (头像) 读取异常:', error);
                   return null;
               }
           },

           async removeAvatarFromDB(characterName) {
               try {
                   const db = await this.initDB();
                   const transaction = db.transaction(['character_avatars'], 'readwrite');
                   const store = transaction.objectStore('character_avatars');
                   const request = store.delete(characterName);
                   return new Promise((resolve, reject) => {
                       request.onsuccess = () => {
                           console.log(`角色头像 [${characterName}] 删除成功`);
                           resolve();
                       };
                       request.onerror = () => {
                           console.error(`角色头像 [${characterName}] 删除失败:`, request.error);
                           reject(request.error);
                       };
                   });
               } catch (error) {
                   console.error('IndexedDB (头像) 删除异常:', error);
                   throw error;
               }
           },

           // --- 头像上传与压缩 ---
           async compressImageForAvatar(file) {
               return new Promise((resolve, reject) => {
                   const MAX_WIDTH = 512;
                   const MAX_HEIGHT = 512;
                   const reader = new FileReader();
                   reader.readAsDataURL(file);
                   reader.onload = (e) => {
                       const img = new Image();
                       img.src = e.target.result;
                       img.onload = () => {
                           let width = img.width;
                           let height = img.height;

                           if (width > height) {
                               if (width > MAX_WIDTH) {
                                   height *= MAX_WIDTH / width;
                                   width = MAX_WIDTH;
                               }
                           } else {
                               if (height > MAX_HEIGHT) {
                                   width *= MAX_HEIGHT / height;
                                   height = MAX_HEIGHT;
                               }
                           }

                           const canvas = document.createElement('canvas');
                           canvas.width = width;
                           canvas.height = height;
                           const ctx = canvas.getContext('2d');
                           ctx.drawImage(img, 0, 0, width, height);
                           
                           // 使用JPEG格式以获得更好的压缩率
                           resolve(canvas.toDataURL('image/jpeg', 0.8));
                       };
                       img.onerror = (error) => reject(error);
                   };
                   reader.onerror = (error) => reject(error);
               });
           },

           async handleAvatarUpload(characterName, file) {
               if (!file.type.startsWith('image/')) {
                   this.showTemporaryMessage('请选择图片文件', 'error');
                   return;
               }
               this.showTemporaryMessage('正在处理图片...', 'info');
               try {
                   // 直接使用原始图片
                   const originalImage = await this.fileToDataUrl(file);
                   const avatarImage = originalImage;
                   const backgroundImage = originalImage;

                   // 智能处理透明度：先读取旧的，如果不存在则用默认值0.5
                   const existingRecord = await this.getAvatarFromDB(characterName);
                   const backgroundOpacity = existingRecord ? existingRecord.backgroundOpacity : 0.5;

                   const newRecord = {
                       characterName: characterName,
                       avatarImage: avatarImage,
                       backgroundImage: backgroundImage,
                       backgroundOpacity: backgroundOpacity
                   };

                   await this.storeAvatarInDB(newRecord);
                   
                   this.showTemporaryMessage('图片上传成功!', 'success');
                   
                   // 立即刷新UI
                   if (document.getElementById('relationships-modal').style.display === 'flex') {
                       this.renderCharacterDetails(characterName); // 刷新详情
                       this.renderCharacterList(); // 刷新列表
                   }
               } catch (error) {
                   console.error('头像上传失败:', error);
                   this.showTemporaryMessage('头像上传失败，请查看控制台', 'error');
               }
           },

           // 清理过期的字体缓存（可选功能）
           cleanupExpiredFontCache() {
             const request = indexedDB.open('GuixuDB', 3);

             request.onerror = () => {
                 console.error('IndexedDB打开失败 (cleanup):', request.error);
             };

             request.onupgradeneeded = (event) => {
                 console.log('IndexedDB升级中 (from cleanup)...');
                 const db = event.target.result;

                 if (!db.objectStoreNames.contains('fonts')) {
                     const fontStore = db.createObjectStore('fonts', { keyPath: 'cacheKey' });
                     fontStore.createIndex('name', 'name', { unique: false });
                     fontStore.createIndex('timestamp', 'timestamp', { unique: false });
                     console.log('对象存储 fonts 创建成功');
                 }

                 if (!db.objectStoreNames.contains('character_avatars')) {
                     const avatarStore = db.createObjectStore('character_avatars', { keyPath: 'characterName' });
                     avatarStore.createIndex('timestamp', 'timestamp', { unique: false });
                     console.log('对象存储 character_avatars 创建成功');
                 }
             };
             
             request.onsuccess = (event) => {
               const db = event.target.result;
               const transaction = db.transaction(['fonts'], 'readwrite');
               const store = transaction.objectStore('fonts');
               
               const now = Date.now();
               const expireTime = 30 * 24 * 60 * 60 * 1000; // 30天过期
               
               store.openCursor().onsuccess = (event) => {
                 const cursor = event.target.result;
                 if (cursor) {
                   const record = cursor.value;
                   if (now - record.timestamp > expireTime) {
                     cursor.delete();
                     console.log(`[归墟文字设置] 清理过期字体缓存: ${record.name}`);
                   }
                   cursor.continue();
                 }
               };
             };
           },

           async showGuixuSystem() {
            this.openModal('guixu-system-modal');
            const body = document.querySelector('#guixu-system-modal .modal-body');
            if (!body) return;
            body.innerHTML =
              '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在连接归墟...</p>';

            try {
              const messages = await getChatMessages(getCurrentMessageId());
              const stat_data = messages?.[0]?.data?.stat_data;
              if (!stat_data) {
                body.innerHTML =
                  '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">无法连接归墟。</p>';
                return;
              }

              const currentLife = this.SafeGetValue(stat_data, '当前第x世', '1');
              const guixuSpace = this.SafeGetValue(stat_data, '归墟空间', '空无一物');
              const guixuPoint = this.SafeGetValue(stat_data, '归墟点', '0');
              const currentChoice = this.SafeGetValue(stat_data, '本世归墟选择', '无');
              const chargeTime = this.SafeGetValue(stat_data, '归墟充能时间', '0');
              const shengli = this.SafeGetValue(stat_data, '年龄', 'N/A');
              const shengliMax = this.SafeGetValue(stat_data, '寿元', 'N/A');
              const xinli = this.SafeGetValue(stat_data, '心理年龄', 'N/A');
              const xinliMax = this.SafeGetValue(stat_data, '心理年龄上限', 'N/A');

              body.innerHTML = `
                    <div class="panel-section">
                        <div class="attributes-list">
                            <div class="attribute-item"><span class="attribute-name">当前世数</span><span class="attribute-value">第 ${currentLife} 世</span></div>
                            <div class="attribute-item"><span class="attribute-name">生理年龄</span><span class="attribute-value">${shengli} / ${shengliMax}</span></div>
                            <div class="attribute-item"><span class="attribute-name">心理年龄</span><span class="attribute-value">${xinli} / ${xinliMax}</span></div>
                            <div class="attribute-item"><span class="attribute-name">归墟空间</span><span class="attribute-value">${guixuSpace}</span></div>
                            <div class="attribute-item"><span class="attribute-name">归墟点</span><span class="attribute-value">${guixuPoint}</span></div>
                            <div class="attribute-item"><span class="attribute-name">本世抉择</span><span class="attribute-value">${currentChoice}</span></div>
                            <div class="attribute-item" style="margin-top: 15px;"><span class="attribute-name">归墟充能</span><span class="attribute-value">${chargeTime}%</span></div>
                            <div class="details-progress-bar">
                                <div class="details-progress-fill" style="width: ${chargeTime}%; background: linear-gradient(90deg, #dc143c, #ff6b6b, #ffd700);"></div>
                            </div>
                          
                          
                                      </div>
                                    </div>
                `;

              // 为静态按钮绑定事件
              const reincarnateBtn = document.getElementById('btn-guixu-reincarnate');
              if (reincarnateBtn) {
                  // 移除旧的监听器以防重复绑定
                  const newBtn = reincarnateBtn.cloneNode(true);
                  reincarnateBtn.parentNode.replaceChild(newBtn, reincarnateBtn);

                  newBtn.addEventListener('click', () => {
                      if (chargeTime >= 100) {
                          this.showCustomConfirm('你确定要开启下一次轮回吗？所有未储存的记忆都将消散。', async () => {
                              try {
                                  const command = '{{user}}选择归墟，世界将回到最初的锚点';
                                  await this.handleAction(command);
                                  this.showTemporaryMessage('轮回已开启...');
                                  this.closeAllModals();
                              } catch (error) {
                                  console.error('执行归墟指令时出错:', error);
                                  this.showTemporaryMessage('执行归墟指令失败！');
                              }
                          });
                      } else {
                          this.showTemporaryMessage('归墟充能进度不足');
                      }
                  });
              }
            } catch (error) {
              console.error('加载归墟系统时出错:', error);
              body.innerHTML =
                '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">加载数据时出错。</p>';
            }
          },

          // --- YAML解析器 (从 kaiju.html 移植) ---
          YAMLParser: {
            parse: function (text) {
              if (!text || typeof text !== 'string') return {};
              const lines = text.split('\n');
              const result = {};
              const stack = [{ indent: -1, obj: result, lastKey: null }];

              for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith('#')) continue;

                  const indent = line.search(/\S/);

                  while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                      stack.pop();
                  }
                  const parent = stack[stack.length - 1].obj;
                  let lastKeyInParent = stack[stack.length - 1].lastKey;

                  if (trimmed.startsWith('- ')) {
                      const value = trimmed.substring(2).trim();
                      if (lastKeyInParent && Array.isArray(parent[lastKeyInParent])) {
                          parent[lastKeyInParent].push(this._parseValue(value));
                      }
                  } else {
                      const colonIndex = trimmed.indexOf(':');
                      if (colonIndex > -1) {
                          const key = trimmed.substring(0, colonIndex).trim();
                          let value = trimmed.substring(colonIndex + 1).trim();
                          
                          stack[stack.length - 1].lastKey = key;

                          if (value === '|' || value === '>') {
                              let multiline = '';
                              const blockStartIndex = lines.indexOf(line) + 1;
                              for (let i = blockStartIndex; i < lines.length; i++) {
                                  const nextLine = lines[i];
                                  const nextIndent = nextLine.search(/\S/);
                                  if (nextLine.trim() === '' || nextIndent > indent) {
                                      multiline += nextLine.substring(indent + 2) + '\n';
                                  } else {
                                      break;
                                  }
                              }
                              parent[key] = multiline.trim();
                          } else if (value === '') {
                               const nextLine = lines[lines.indexOf(line) + 1] || '';
                               const nextTrimmed = nextLine.trim();
                               const nextIndent = nextLine.search(/\S/);
                               if (nextTrimmed.startsWith('- ') && nextIndent > indent) {
                                   const newArr = [];
                                   parent[key] = newArr;
                               } else if (nextIndent > indent) {
                                   const newObj = {};
                                   parent[key] = newObj;
                                   stack.push({ indent: indent, obj: newObj, lastKey: null });
                               } else {
                                   parent[key] = '';
                               }
                          } else {
                              parent[key] = this._parseValue(value);
                          }
                      }
                  }
              }
              return result;
            },
            _parseValue: function (val) {
              const numVal = Number(val);
              if (!isNaN(numVal) && val.trim() !== '') {
                return numVal;
              }
              if (val === 'true') return true;
              if (val === 'false') return false;
              return val;
            },
          },

          // --- 归墟空间：加载商品 ---
          async loadGuixuStoreItems() {
            try {
              if (typeof TavernHelper === 'undefined' || typeof TavernHelper.getGlobalWorldbookNames !== 'function' || typeof TavernHelper.getWorldbook !== 'function') {
                console.error('TavernHelper API not available.');
                this.showTemporaryMessage('错误：世界书API不可用');
                return [];
              }

              // 1. 获取所有启用的世界书名称
              const enabledBookNames = TavernHelper.getGlobalWorldbookNames();
              
              // 2. 筛选出目标世界书名称
              let targetBookNames = enabledBookNames.filter(name => name.startsWith('【归墟扩展】'));
              
              // 3. 添加 '1归墟' 并去重
              if (!targetBookNames.includes('1归墟')) {
                  targetBookNames.push('1归墟');
              }
              
              let allEntries = [];
              for (const bookName of targetBookNames) {
                  try {
                      const entries = await TavernHelper.getWorldbook(bookName);
                      allEntries.push(...entries);
                  } catch (e) {
                      console.warn(`无法加载世界书 "${bookName}" 的内容:`, e);
                  }
              }

              if (allEntries.length === 0) {
                console.warn('在目标世界书中未找到任何条目。');
                return [];
              }

              const validItemPrefixes = ['【天赋】', '【背景】'];
              const itemEntries = allEntries.filter(entry => {
                return validItemPrefixes.some(prefix => entry.name.startsWith(prefix));
              });

              if (itemEntries.length === 0) {
                  console.log('在目标世界书中未找到符合商品前缀的条目。');
                  return [];
              }
              
              const items = itemEntries.map(entry => {
                try {
                  const parsedContent = this.YAMLParser.parse(entry.content);
                  // 修复：兼容“价格”和“消耗点数”两种字段，并提供默认值
                  const priceValue = parsedContent.价格 ?? parsedContent.消耗点数 ?? 0;
                  const price = parseInt(priceValue, 10);

                  const itemId = `gs-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  return {
                    id: itemId,
                    name: parsedContent.名称 || entry.name.replace(/【.*?】/g, '').trim(),
                    price: price,
                    description: parsedContent.描述 || '暂无描述',
                    type: parsedContent.类型 || entry.name.match(/【(.*?)】/)?.[1] || '物品',
                    tier: parsedContent.品阶 || '凡品',
                    fullContent: entry.content,
                  };
                } catch (e) {
                  console.error(`解析世界书条目 "${entry.name}" 时出错:`, e);
                  return null;
                }
              }).filter(item => item !== null);

              return items;

            } catch (error) {
              console.error('加载归墟空间商品时出错:', error);
              this.showTemporaryMessage('加载商品失败');
              return [];
            }
          },

          currentGuixuSort: '默认',
          guixuItemDOMElements: {}, // 新增：用于缓存DOM元素
          // --- 归墟空间：主界面 ---
          async showGuixuSpace(filterType = '全部', isUpdate = false) {
            this.currentGuixuFilter = filterType;
            this.openModal('guixu-space-modal', true);
            const body = document.querySelector('#guixu-space-modal .modal-body');
            if (!body) return;

            // --- 性能优化：仅在首次加载时完全重绘 ---
            if (!isUpdate) {
               if (!this.currentMvuState || !this.currentMvuState.stat_data) {
                   body.innerHTML = '<p class="modal-placeholder">正在加载玩家数据...</p>';
                   await this.loadMvuData();
                   if (!this.currentMvuState || !this.currentMvuState.stat_data) {
                       this.showTemporaryMessage('无法加载玩家数据，请刷新页面');
                       return;
                   }
               }

               body.innerHTML = '<p class="modal-placeholder">正在从世界书中加载商品...</p>';
               const allItems = await this.loadGuixuStoreItems();
               this.guixuStoreItems = allItems;
               this.guixuItemDOMElements = {}; // 清空缓存
            }

            let filteredItems = filterType === '全部' ? this.guixuStoreItems : this.guixuStoreItems.filter(item => item.type === filterType);

            switch (this.currentGuixuSort) {
               case '品阶 (高到低)':
                   filteredItems = this.sortByTier(filteredItems, item => item.tier);
                   break;
               case '品阶 (低到高)':
                   filteredItems = this.sortByTier(filteredItems, item => item.tier).reverse();
                   break;
               case '点数 (高到低)':
                   filteredItems.sort((a, b) => b.price - a.price);
                   break;
               case '点数 (低到高)':
                   filteredItems.sort((a, b) => a.price - b.price);
                   break;
            }

            const guixuPoints = this.SafeGetValue(this.currentMvuState.stat_data, '归墟点', 0);
            
            // --- 性能优化：仅在首次加载时渲染Header和Grid容器 ---
            if (!isUpdate) {
               const filters = ['全部', '天赋', '背景'];
               const sorts = ['默认', '品阶 (高到低)', '品阶 (低到高)', '点数 (高到低)', '点数 (低到高)'];
               const headerHtml = `
                 <div class="guixu-space-header">
                   <div class="guixu-filter-tabs">
                     ${filters.map(f => `<button class="tab-btn ${filterType === f ? 'active' : ''}" data-filter="${f}">${f}</button>`).join('')}
                   </div>
                   <div class="guixu-controls">
                      <select class="guixu-sort-select">
                          ${sorts.map(s => `<option value="${s}" ${this.currentGuixuSort === s ? 'selected' : ''}>${s}</option>`).join('')}
                      </select>
                      <div class="points-display">
                        <span>归墟点: ${guixuPoints}</span>
                      </div>
                   </div>
                 </div>`;
               body.innerHTML = headerHtml + '<div class="guixu-item-grid"></div><p class="modal-placeholder" style="display:none;">暂无此类商品</p>';
               this.bindGuixuSpaceEvents(body);
            }
            
            // --- 性能优化：DOM复用和局部更新 ---
            const grid = body.querySelector('.guixu-item-grid');
            const placeholder = body.querySelector('.modal-placeholder');
            if (!grid || !placeholder) return;

            // 更新UI状态
            body.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filterType));
            body.querySelector('.guixu-sort-select').value = this.currentGuixuSort;
            body.querySelector('.points-display span').textContent = `归墟点: ${guixuPoints}`;

            if (!filteredItems || filteredItems.length === 0) {
                grid.innerHTML = '';
                placeholder.style.display = 'block';
                return;
            }
            
            placeholder.style.display = 'none';

            const fragment = document.createDocumentFragment();
            
            // 创建或更新DOM元素
            filteredItems.forEach((item, index) => {
               let card = this.guixuItemDOMElements[item.id];
               if (!card) {
                   const tierStyle = this.getNewTierStyle(item.tier);
                   const cardHtml = `
                       <div class="item-content">
                         <h4 class="item-name" style="${tierStyle}">
                           ${item.name}
                           <span class="item-tier">${item.tier}</span>
                         </h4>
                         <p class="item-description">${item.description}</p>
                       </div>
                       <div class="item-footer">
                         <span class="item-price">${item.price} 点</span>
                         <button class="purchase-btn" data-item-id="${item.id}"></button>
                       </div>`;
                   card = document.createElement('div');
                   card.className = 'guixu-item-card';
                   card.innerHTML = cardHtml;
                   this.guixuItemDOMElements[item.id] = card;
               }
               
               // 更新动态内容
               card.style.animationDelay = `${index * 0.05}s`;
               const purchaseBtn = card.querySelector('.purchase-btn');
               purchaseBtn.disabled = guixuPoints < item.price;
               purchaseBtn.textContent = '购买';
               
               fragment.appendChild(card);
            });
            
            // 一次性更新DOM
            grid.innerHTML = ''; // 清空
            grid.appendChild(fragment); // 附加
          },

          bindGuixuSpaceEvents(container) {
              // --- 修复：分离click和change事件处理器，解决点击即刷新的bug ---
              const clickHandler = (event) => {
                  const target = event.target;
                  if (target.classList.contains('purchase-btn')) {
                      if (target.disabled) {
                          this.showTemporaryMessage('归墟点不足');
                          return;
                      }
                      const itemId = target.dataset.itemId;
                      this.handlePurchase(itemId);
                  } else if (target.classList.contains('tab-btn')) {
                      const filter = target.dataset.filter;
                      this.showGuixuSpace(filter, true);
                  }
              };

              const changeHandler = (event) => {
                  const target = event.target;
                  if (target.classList.contains('guixu-sort-select')) {
                      this.currentGuixuSort = target.value;
                      this.showGuixuSpace(this.currentGuixuFilter, true);
                  }
              };

              if (!this.guixuEventHandlers) {
                  this.guixuEventHandlers = new WeakMap();
              }

              if (this.guixuEventHandlers.has(container)) {
                  const oldHandlers = this.guixuEventHandlers.get(container);
                  container.removeEventListener('click', oldHandlers.click);
                  container.removeEventListener('change', oldHandlers.change);
              }

              container.addEventListener('click', clickHandler);
              container.addEventListener('change', changeHandler);
              
              this.guixuEventHandlers.set(container, {
                  click: clickHandler,
                  change: changeHandler
              });
          },

          // --- 新增：归墟空间UI静默刷新 ---
          _silentUpdateGuixuSpaceUI() {
              const guixuPoints = this.SafeGetValue(this.currentMvuState.stat_data, '归墟点', 0);
              const modalBody = document.querySelector('#guixu-space-modal .modal-body');
              if (!modalBody) return;

              // 1. 更新归墟点显示
              const pointsDisplay = modalBody.querySelector('.points-display span');
              if (pointsDisplay) {
                  pointsDisplay.textContent = `归墟点: ${guixuPoints}`;
              }

              // 2. 更新所有购买按钮的状态
              this.guixuStoreItems.forEach(item => {
                  const purchaseBtn = modalBody.querySelector(`button[data-item-id="${item.id}"]`);
                  if (purchaseBtn) {
                      purchaseBtn.disabled = guixuPoints < item.price;
                  }
              });
              console.log('[归墟空间] UI静默刷新完成');
          },

          // --- 纯前端MVU指令执行 ---
          async executeMvuCommandFrontend(command, options = { silent: false }) {
              console.log(`[归墟-前端执行] 命令: ${command}`, `(Silent: ${options.silent})`);
              const modifiedState = this._applyUpdateFallback(command, this.currentMvuState);
              if (modifiedState) {
                  this.currentMvuState = modifiedState;
                  if (!options.silent) {
                      this.renderUI(this.currentMvuState.stat_data);
                  }
                  console.log('[归墟-前端执行] 前端备用方案执行成功');
              } else {
                  throw new Error('MVU前端命令执行失败');
              }
          },

          // --- 归墟空间：处理购买 (已重构，包含二次确认和正确的指令格式) ---
          async handlePurchase(itemId) {
              const item = this.guixuStoreItems.find(i => i.id === itemId);
              if (!item) {
                  console.error('找不到要购买的商品:', itemId);
                  return;
              }

              const currentPoints = parseInt(this.SafeGetValue(this.currentMvuState.stat_data, '归墟点', 0), 10);

              if (currentPoints < item.price) {
                  this.showTemporaryMessage('归墟点不足');
                  return;
              }

              const confirmMessage = `确定要花费 ${item.price} 归墟点购买【${item.name}】吗？`;

              this.showCustomConfirm(confirmMessage, async () => {
                  try {
                      // 1. 构建并执行扣款指令
                      const deductCommand = `_.add('归墟点[0]', -${item.price}); // 购买 ${item.name}`;
                      await this.executeMvuCommandFrontend(deductCommand, { silent: true });

                      // 2. 静默持久化状态
                      const messageId = getCurrentMessageId();
                      if (messageId >= 0) {
                          await setChatMessage({ data: this.currentMvuState }, messageId, { refresh: 'none' });
                      }

                      // 3. 构建正确的纯文本指令并添加到队列
                      const gainMessage = `<user>购买了${item.name}，详细信息：\n${item.fullContent}`;
                      this.pendingActions.push({
                          action: 'send_as_is', // 使用一个纯文本标识，避免被解析为未知指令
                          text: `[获得] ${item.name}`, // 指令中心显示的文本
                          command: gainMessage // 执行时发送的原始文本
                      });
                      this.savePendingActions();
                      
                      this.showTemporaryMessage(`购买成功：【${item.name}】。获得指令已发送至指令中心。`);
                      this._silentUpdateGuixuSpaceUI(); // 静默刷新UI,不跳转

                  } catch (error) {
                      console.error('购买过程中发生错误:', error);
                      this.showTemporaryMessage(`购买失败: ${error.message}`);
                  }
              }, null, true, { customClass: 'guixu-confirm-modal' }); // 新增：传入自定义样式类
          },

          openModal(modalId, keepOpen = false) {
            if (!keepOpen) {
                this.closeAllModals();
            }
            const modal = document.getElementById(modalId);
            if (modal) {
                // --- 新增修复逻辑 ---
                const rootContainer = document.querySelector('.guixu-root-container');
                // 检查模态框是否不在根容器内
                if (rootContainer && modal.parentNode !== rootContainer) {
                    // 如果是，则将其移动到根容器的末尾，以确保它在全屏时可见
                    rootContainer.appendChild(modal);
                    console.log(`[归墟修复] 已将模态框 #${modalId} 移动到主容器内以兼容全屏模式。`);
                }
                // --- 修复逻辑结束 ---

                modal.style.display = 'flex';
                if (keepOpen) {
                    // Find the highest z-index among visible modals and set the new one higher
                    const highestZ = Array.from(document.querySelectorAll('.modal-overlay'))
                        .filter(el => el.style.display === 'flex' && el.id !== modalId)
                        .reduce((maxZ, el) => Math.max(maxZ, parseInt(window.getComputedStyle(el).zIndex, 10) || 1000), 1000);
                    modal.style.zIndex = highestZ + 1;
                } else {
                    modal.style.zIndex = ''; // Reset to default CSS z-index
                }
                
                // --- 新增：应用保存的模态框大小设置 ---
                this.applyModalSizeToModal(modal);

            }
          },

          // 新增：为特定模态框应用大小设置
          applyModalSizeToModal(modal) {
              try {
                  // --- 核心修复：如果模态框是定制化确认框，则跳过全局大小调整 ---
                  if (modal.classList.contains('guixu-confirm-modal')) {
                      return;
                  }
                  const savedState = localStorage.getItem('guixu_modal_size');
                  // 豁免人物关系模态框，它的尺寸由其内部CSS控制
                  if (savedState && modal.id !== 'relationships-modal') {
                      const { width, height } = JSON.parse(savedState);
                      if (width && height) {
                          const modalContent = modal.querySelector('.modal-content');
                          if (modalContent) {
                              modalContent.style.maxWidth = `${width}px`;
                              modalContent.style.width = `${Math.min(width, window.innerWidth * 0.9)}px`;
                              modalContent.style.height = `${Math.min(height, window.innerHeight * 0.9)}px`;
                              modalContent.style.maxHeight = `${Math.min(height, window.innerHeight * 0.9)}px`;
                              modalContent.style.overflow = 'auto';
                          }
                      }
                  }
              } catch (e) {
                  console.error('应用模态框大小设置失败:', e);
              }
          },

          closeModal(modalId) {
              const modal = document.getElementById(modalId);
              if (modal) {
                  modal.style.display = 'none';
                  modal.style.zIndex = ''; // Reset z-index

              }
          },

          // --- 新增：处理模态框关闭的统一方法 ---
           handleModalClose(event) {
            const modalOverlay = event.target.closest('.modal-overlay');

           if (modalOverlay && modalOverlay.id === 'guixu-space-modal') {
               this.closeModal('guixu-space-modal');
               this.openModal('guixu-system-modal');
               return;
           }

            // --- 衍梦尘子窗口关闭逻辑修改 ---
            if (modalOverlay && (modalOverlay.id === 'gacha-results-modal' || modalOverlay.id === 'gacha-history-modal' || modalOverlay.id === 'gacha-details-modal' || modalOverlay.id === 'gacha-gallery-popup' || modalOverlay.id === 'gacha-settings-popup')) {
        this.closeModal(modalOverlay.id); // 只关闭当前子窗口
                 // 核心修复：如果关闭的是召唤结果窗口，则刷新召唤主界面
                if (modalOverlay.id === 'gacha-results-modal') {
                    this.renderSummonTab(this.currentGachaPoolType);
                }
                return; // 结束处理
            }

            // --- 衍梦尘主窗口关闭逻辑 ---
            if (modalOverlay && modalOverlay.id === 'gacha-modal') {
                // 检查是否从归墟系统进入
                if (this.isFromGuixuSystem) {
                    this.closeModal(modalOverlay.id); // 关闭gacha主窗口
                    this.showGuixuSystem(); // 返回归墟系统界面
                    this.isFromGuixuSystem = false; // 重置标志
                    return; // 结束处理
                }
                // 如果不是从归墟系统进入，则会执行下面的默认关闭逻辑
            }

            if (!modalOverlay) {
              this.closeAllModals();
              return;
            }

            const modalId = modalOverlay.id;
            
            // 特殊处理格式验证模态框关闭
            if (modalId === 'format-validation-modal') {
              // 关闭等待消息
              this.hideWaitingMessage();
              // 填充原始内容而不是清空
              const gameTextDisplay = document.getElementById('game-text-display');
              if (gameTextDisplay && this.lastValidGametxtHTML) {
                gameTextDisplay.innerHTML = this.lastValidGametxtHTML;
                this.updateLiveWordCount(); // 新增：调用字数统计函数
              }
              this.closeModal(modalId);
              this.showTemporaryMessage('已取消格式验证，内容已恢复。');
              return;
            }
            
            // 检查是否是从设置界面进入的子窗口
            if (this.isFromSettingsModal &&
                (modalId === 'command-center-modal' ||
                 modalId === 'extracted-content-modal' ||
                 modalId === 'map-modal' ||
                 modalId === 'background-settings-modal' ||
                 modalId === 'worldbook-manager-modal' ||
                 modalId === 'segmented-memory-modal')) { // 新增对分段记忆模态框的判断
              // 关闭当前子窗口并返回设置界面
              this.closeModal(modalId);
              this.isFromSettingsModal = false; // 重置状态
              this.showSettings();
            } else {
              // 正常关闭所有模态框
              this.closeAllModals();
            }
          },

          closeAllModals() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
              modal.style.display = 'none';
            });
           // 新增：关闭地图时重置其状态
           this.resetMapState();
           // 注释掉：不在这里重置设置状态标志，让handleModalClose来处理
           // this.isFromSettingsModal = false;
           
           // 同时关闭窗口大小调整面板
           this.hideWindowSizePanel();
          },

          showCustomConfirm(message, onConfirm, onCancel = null, keepCurrentModal = false, options = {}) {
            const modal = document.getElementById('custom-confirm-modal');
            const messageEl = document.getElementById('custom-confirm-message');
            const okBtn = document.getElementById('custom-confirm-btn-ok');
            const cancelBtn = document.getElementById('custom-confirm-btn-cancel');
            const closeBtn = modal?.querySelector('.modal-close-btn');

            if (!modal || !messageEl || !okBtn || !cancelBtn) return;

            // --- 新增：处理自定义样式类 ---
            if (options.customClass) {
                modal.classList.add(options.customClass);
            }

            messageEl.textContent = message;

            // 使用 .cloneNode(true) 来移除旧的事件监听器
            const newOkBtn = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);

            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            const closeAction = () => {
                // --- 新增：清理自定义样式类 ---
                if (options.customClass) {
                    modal.classList.remove(options.customClass);
                }
                if (keepCurrentModal) {
                    this.closeModal('custom-confirm-modal');
                    // 如果是从预设管理界面进入的，返回预设管理界面
                    if (this.isFromWorldbookManager) {
                        this.showWorldbookPresets();
                    }
                } else {
                    this.closeAllModals();
                }
            };

            newOkBtn.addEventListener('click', () => {
              closeAction();
              if (typeof onConfirm === 'function') {
                onConfirm();
              }
            });

            newCancelBtn.addEventListener('click', () => {
              closeAction();
              if (typeof onCancel === 'function') {
                onCancel();
              }
            });

            // 处理关闭按钮（×）
            if (closeBtn) {
              closeBtn.onclick = () => {
                closeAction();
                if (typeof onCancel === 'function') {
                  onCancel();
                }
              };
            }

            this.openModal('custom-confirm-modal', keepCurrentModal);
          },

          // --- Feature Implementations (now simplified) ---
           async showMap() {
             // 优化：只在首次打开时读取数据，之后只显示/隐藏
             const modal = document.getElementById('map-modal');
             const body = document.querySelector('#map-modal-body');
             if (!modal || !body) return;

             // 如果地图内容尚未加载，则执行一次性加载
             if (!body.dataset.loaded) {
                body.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在加载地图数据...</p>';
                this.openModal('map-modal');

                try {
                    const bookName = '1归墟';
                    const mapEntryKey = '地图';
                    const allEntries = await TavernHelper.getLorebookEntries(bookName);
                    const mapEntry = allEntries.find(entry => entry.comment === mapEntryKey);

                    if (!mapEntry || !mapEntry.content) {
                        body.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">在世界书“1归墟”中未找到“地图”条目或内容为空。</p>';
                        return;
                    }

                    const locations = this.parseMapData(mapEntry.content);
                    console.log('[归墟地图] 解析出的地点数据:', locations);

                    const stat_data = this.currentMvuState?.stat_data;
                    const playerPos = stat_data ? this.SafeGetValue(stat_data, '当前位置', null) : null;
                    
                    // 渲染地图内容
                    this.renderMap(body, locations, playerPos);
                    
                    // 为地图容器绑定一次性事件
                    this.bindMapEvents(body);
                    
                    // 标记为已加载
                    body.dataset.loaded = 'true';

                } catch (error) {
                    console.error('加载地图数据时出错:', error);
                    body.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:red; font-size:12px;">加载地图失败: ${error.message}</p>`;
                }
             } else {
                // 如果已加载，直接打开模态框
                this.openModal('map-modal');
             }
           },

           parseMapData(content) {
               if (!content || typeof content !== 'string') return [];
               const locations = [];
               const lines = content.trim().split('\n');

               lines.forEach(line => {
                   if (!line.startsWith('[') || !line.endsWith(']')) return; // 跳过格式不正确的行

                   const parts = line.substring(1, line.length - 1).split('|');
                   if (parts.length < 3) return; // 至少需要 名称, x, y

                   const locationData = { name: parts[0].trim() };
                   let hasX = false;
                   let hasY = false;

                   // 从索引1开始遍历，因为索引0是名称
                   for (let i = 1; i < parts.length; i++) {
                       const part = parts[i].trim();
                       const separatorIndex = part.indexOf(':');

                       // 强制要求所有字段都必须是 key:value 格式
                       if (separatorIndex === -1) {
                           console.warn(`[归墟地图] 无效的键值对格式，已跳过部分: "${part}" in line: "${line}"`);
                           continue; // 跳过这个格式错误的部分
                       }

                       const key = part.substring(0, separatorIndex).trim();
                       const value = part.substring(separatorIndex + 1).trim();

                       if (key && value) {
                           locationData[key] = value;
                           if (key === 'x') hasX = true;
                           if (key === 'y') hasY = true;
                       }
                   }

                   // 只有当明确包含x和y坐标时，才将地点添加到列表中
                   if (hasX && hasY) {
                       locations.push(locationData);
                   } else {
                       console.warn(`[归墟地图] 跳过不包含有效x,y坐标的地点:`, line);
                   }
               });

               return locations;
           },

           renderMap(container, locations, playerPos = null) {
                if (!container) return;
 
                container.innerHTML = ''; // 清空旧内容

               const mapContainer = document.createElement('div');
               mapContainer.className = 'map-container';

               // --- 最终的、完善的JS动态网格 ---
               const gridContainer = document.createElement('div');
               const mapSize = 10000; // 创建一个巨大的虚拟网格尺寸
               const gridSize = 15;   // 您期望的网格密度
               const gridColor = '#cccccc'; // 清晰的淡灰色

               // 使用 transform 居中这个巨大的网格
               gridContainer.style.cssText = `
                   position: absolute;
                   left: 50%;
                   top: 50%;
                   transform: translate(-50%, -50%);
                   width: ${mapSize}px;
                   height: ${mapSize}px;
                   z-index: 0;
                   pointer-events: none;
               `;

               for (let i = 0; i < mapSize; i += gridSize) {
                   // 垂直线
                   const vLine = document.createElement('div');
                   vLine.style.cssText = `position: absolute; left: ${i}px; top: 0; width: 1px; height: 100%; background-color: ${gridColor};`;
                   gridContainer.appendChild(vLine);
                   // 水平线
                   const hLine = document.createElement('div');
                   hLine.style.cssText = `position: absolute; left: 0; top: ${i}px; width: 100%; height: 1px; background-color: ${gridColor};`;
                   gridContainer.appendChild(hLine);
               }
               mapContainer.appendChild(gridContainer);
               // --- 网格绘制结束 ---

               const SCALE_FACTOR = 100; // 将世界坐标缩小100倍以适应像素

               locations.forEach(loc => {
                   const dot = document.createElement('div');
                   dot.className = 'map-location-dot';

                   const width = parseInt(loc.w || loc.width || 10, 10);
                   const height = parseInt(loc.h || loc.height || 10, 10);
                   const area = width * height;
                   // 面积越小，z-index越高。设置一个基础值（如10），然后加上一个与面积成反比的值。
                   // 100000 是一个调节因子，可以根据实际情况调整。
                   dot.style.zIndex = 10 + Math.floor(100000 / (area + 1));

                   const x = parseFloat(loc.x) / SCALE_FACTOR;
                   const y = parseFloat(loc.y) / SCALE_FACTOR;

                   if (isNaN(x) || isNaN(y)) {
                       console.warn('[归墟地图] 地点坐标无效，跳过渲染:', loc.name, loc.x, loc.y);
                       return; // 跳过无效坐标的地点
                   }
                   
                   // 坐标相对于中心点 (50%, 50%) 进行偏移
                   dot.style.left = `calc(50% + ${x}px)`;
                   dot.style.top = `calc(50% + ${y}px)`;
                   
                   dot.textContent = loc.name; // 直接将名称作为内容
                   dot.dataset.state = loc.state || '正常';
                   dot.dataset.type = loc.type || '中立'; // 确保总有一个type

                   dot.style.width = `${width}px`;
                   dot.style.height = `${height}px`;

                   // 修正字体大小计算逻辑，确保文本完全容纳
                   const FONT_SCALING_FACTOR = 0.9; // 使用小于1的系数来增加水平边距
                   const minHeightBasedSize = height * 0.8; // 垂直方向最多占80%
                   const minWidthBasedSize = (width / loc.name.length) * FONT_SCALING_FACTOR;
                   const baseFontSize = Math.max(4, Math.min(minHeightBasedSize, minWidthBasedSize));
                   dot.style.fontSize = `${baseFontSize}px`;

                   // 根据类型设置不同背景颜色
                   const typeColors = {
                     '宗门': 'rgba(66, 165, 245, 0.8)', // 蓝色
                     '险地': 'rgba(239, 83, 80, 0.8)', // 红色
                     '仙宫': 'rgba(255, 215, 0, 0.8)', // 金色
                     '中立': 'rgba(189, 189, 189, 0.8)', // 灰色
                     '城池': 'rgba(161, 136, 127, 0.8)', // 棕色
                   };

                   if (loc.type && typeColors[loc.type]) {
                     dot.style.backgroundColor = typeColors[loc.type]; // 修改为设置背景色
                   }
                   
                   dot.addEventListener('click', (e) => {
                       e.stopPropagation();
                       // 新增：点击后弹出确认框，确认后将指令加入队列
                       // 第三个参数 true 让确认框叠加在当前地图上，而不是关闭地图
                       this.showCustomConfirm(`你确定要前往【${loc.name}】吗？`, () => {
                           this.addTravelAction(loc);
                       }, true);
                   });

                   mapContainer.appendChild(dot);
               });

               // 在循环之后，添加渲染玩家光标的逻辑
                if (playerPos && playerPos.x !== undefined && playerPos.y !== undefined) {
                    const cursor = document.createElement('div');
                    cursor.className = 'player-cursor';
                    
                    // 统一使用像素定位
                    const playerX = parseFloat(playerPos.x) / SCALE_FACTOR;
                    const playerY = parseFloat(playerPos.y) / SCALE_FACTOR;

                    if (!isNaN(playerX) && !isNaN(playerY)) {
                        cursor.style.left = `calc(50% + ${playerX}px)`;
                        cursor.style.top = `calc(50% + ${playerY}px)`;
                        cursor.title = `你在这里：${playerPos.area_name || '未知区域'} (x:${playerPos.x}, y:${playerPos.y})`;
                        cursor.style.zIndex = '10'; // 确保在地点之上
                        mapContainer.appendChild(cursor);
                        // 新增：缓存玩家在地图容器中的像素位置
                        this.mapState.playerMapPos = { x: playerX, y: playerY };
                    } else {
                        this.mapState.playerMapPos = null;
                    }
                } else {
                   this.mapState.playerMapPos = null;
                }

                // 根据是否存在玩家位置来启用/禁用按钮
                const centerBtn = document.getElementById('btn-center-player');
                if(centerBtn) {
                   centerBtn.disabled = !this.mapState.playerMapPos;
                }

               container.appendChild(mapContainer);
              
              this.updateMapTransform();
              this.updateZoomSliderUI(); // 新增：初始化滑块UI
          },

          async showInventory() {
            this.openModal('inventory-modal');
            const body = document.querySelector('#inventory-modal .modal-body');
            if (!body) return;

            body.innerHTML =
              '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在清点行囊...</p>';

            try {
              const messages = await getChatMessages(getCurrentMessageId());
              if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
                body.innerHTML =
                  '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">无法获取背包数据。</p>';
                console.warn('无法从当前消息中加载 stat_data 用于背包。');
                return;
              }
              const stat_data = messages[0].data.stat_data;
              body.innerHTML = this.renderInventory(stat_data || {});
            } catch (error) {
              console.error('加载背包时出错:', error);
              body.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">加载背包时出错: ${error.message}</p>`;
            }
          },

          // 新增：显示世界大事
          async showWorldEvents() {
            this.openModal('world-events-modal');
            const body = document.querySelector('#world-events-modal .modal-body');
            if (!body) return;

            body.innerHTML =
              '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在加载世界大事...</p>';

            try {
              const messages = await getChatMessages(getCurrentMessageId());
              if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
                body.innerHTML =
                  '<div class="world-events-empty"><div class="world-events-empty-icon">🌍</div><div class="world-events-empty-title">暂无世界大事</div><div class="world-events-empty-description">当前没有可显示的世界大事记录</div></div>';
                console.warn('无法从当前消息中加载 stat_data 用于世界大事。');
                return;
              }
              const stat_data = messages[0].data.stat_data;
              body.innerHTML = this.renderWorldEvents(stat_data || {});
            } catch (error) {
              console.error('加载世界大事时出错:', error);
              body.innerHTML = `<div class="world-events-empty"><div class="world-events-empty-icon">❌</div><div class="world-events-empty-title">加载失败</div><div class="world-events-empty-description">加载世界大事时出错: ${error.message}</div></div>`;
            }

            // 绑定世界大事模态框内的按钮事件
            this.bindWorldEventsModalEvents();
          },

          // 新增：绑定世界大事模态框事件
          bindWorldEventsModalEvents() {
            // 刷新按钮
            document.getElementById('btn-world-events-refresh')?.addEventListener('click', () => {
              this.showWorldEvents();
            });

            // 时间轴模式按钮
            const timelineModeBtn = document.getElementById('btn-world-events-timeline-mode');
            if (timelineModeBtn) {
              timelineModeBtn.addEventListener('click', () => {
                this.worldEventsViewMode = this.worldEventsViewMode === 'timeline' ? 'list' : 'timeline';
                this.showWorldEvents(); // 重新渲染
              });
              // 更新按钮文本
              timelineModeBtn.textContent = this.worldEventsViewMode === 'timeline' ? '切换为列表模式' : '切换为时间轴模式';
            }
          },

          // 新增：渲染世界大事HTML
          renderWorldEvents(stat_data) {
            // 检查是否有世界大事数据
            const worldEvents = stat_data.世界大事 || stat_data.world_events || {};
            
            if (!worldEvents || Object.keys(worldEvents).length === 0) {
              return `
                <div class="world-events-empty">
                  <div class="world-events-empty-icon">🌍</div>
                  <div class="world-events-empty-title">暂无世界大事</div>
                  <div class="world-events-empty-description">当前世界还没有发生重大事件</div>
                </div>
              `;
            }

            // 将世界大事转换为数组并按时间排序
            const eventsArray = Object.entries(worldEvents)
              .filter(([_, event]) => typeof event === 'object' && event !== null)
              .map(([key, event]) => ({ id: key, ...event }));

            // 按时间排序
            eventsArray.sort((a, b) => {
                const timeA = a.时间?.日期 || a.time?.日期 || a.id;
                const timeB = b.时间?.日期 || b.time?.日期 || b.id;
                // 简单的字符串比较可能不适用于所有日期格式，但对于 "玄昊历X年X月X日" 格式是有效的
                return timeB.localeCompare(timeA);
            });

            if (this.worldEventsViewMode === 'list') {
              let html = '<div class="world-events-list">';
              eventsArray.forEach(event => {
                const title = event.title || event.标题 || '未知事件';
                let timeString = '';
                 if (event.time || event.时间) {
                    const timeData = event.time || event.时间;
                    const shi = timeData.第几世 ? `第${timeData.第几世}世 ` : '';
                    const date = timeData.日期 || '';
                    timeString = `${shi}${date}`;
                }
                html += `
                  <div class="world-events-list-item">
                    <span class="world-events-list-time">${this.escapeHtml(timeString)}</span>
                    <span class="world-events-list-title">${this.escapeHtml(title)}</span>
                  </div>
                `;
              });
              html += '</div>';
              return html;
            } else {
              // 默认时间轴模式
              let html = '<div class="world-events-timeline"><div class="timeline-container">';
              eventsArray.forEach(event => {
                html += this.renderWorldEventItem(event);
              });
              html += '</div></div>';
              return html;
            }
          },

          // 新增：渲染单个世界大事项目
          renderWorldEventItem(event) {
            const title = event.title || event.标题 || '未知事件';
            const description = event.description || event.描述 || '';
            
            // 处理时间对象
            let timeString = '';
            if (event.time || event.时间) {
              const timeData = event.time || event.时间;
              const shi = timeData.第几世 ? `第${timeData.第几世}世 ` : '';
              const date = timeData.日期 || '';
              timeString = `${shi}${date}`;
            }
            
            const location = event.location || event.地点 || '';
            
            // 处理影响对象
            let impactHtml = '';
            if (event.impact || event.影响) {
              const impactData = event.impact || event.影响;
              const shortTerm = impactData.短期影响 || '';
              const longTerm = impactData.长期影响 || '';
              if (shortTerm || longTerm) {
                impactHtml = `
                    <div class="world-events-impact">
                      <div class="world-events-impact-title">影响与后果</div>
                      <div class="world-events-impact-content">
                        ${shortTerm ? `<p><strong>短期影响:</strong> ${this.escapeHtml(shortTerm)}</p>` : ''}
                        ${longTerm ? `<p><strong>长期影响:</strong> ${this.escapeHtml(longTerm)}</p>` : ''}
                      </div>
                    </div>
                `;
              }
            }

            const tags = event.tags || event.标签 || [];
            const importance = event.importance || event.重要性 || 'normal';

            return `
              <div class="world-events-timeline .timeline-event" data-importance="${importance}">
                <div class="world-events-event-header">
                  <div class="world-events-event-title">${this.escapeHtml(title)}</div>
                  ${timeString ? `<div class="world-events-event-time">${this.escapeHtml(timeString)}</div>` : ''}
                </div>
                <div class="world-events-event-content">
                  ${description ? `<div class="world-events-event-description">${this.escapeHtml(description)}</div>` : ''}
                  ${location ? `<div style="font-size: 12px; color: #c9aa71; margin-bottom: 8px;">📍 ${this.escapeHtml(location)}</div>` : ''}
                  ${impactHtml}
                  ${tags.length > 0 ? `
                    <div class="world-events-event-tags">
                      ${tags.map(tag => `<span class="world-events-tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          },

          // 新增：显示变量修改器 - 已禁用
          async showVariableEditor() {
            console.log('[变量修改器] 功能已禁用');
            return;
            /*
            this.openModal('variable-editor-modal');
            this.initVariableEditor();
            
            // 初始化智能编辑器功能
            this.initKeyboardShortcuts();
            */
          },

          // 新增：初始化变量修改器
          initVariableEditor() {
            // 重置表单
            document.getElementById('variable-category').value = '';
            const pathInput = document.getElementById('variable-path');
            if (pathInput) {
              pathInput.value = '';
            }
            document.getElementById('current-variable-value').textContent = '未加载';
            document.getElementById('new-variable-value').value = '';
            document.getElementById('change-reason').value = '';
            document.getElementById('mvu-command-preview').textContent = '请先加载变量并设置新值';
            
            // 重置变量列表
            document.getElementById('variable-list').innerHTML = '<div class="placeholder">请选择分类查看变量</div>';
            
            // 设置默认操作类型
            this.setOperationType('set');
            
            // 设置默认标签页
            this.switchTab('browse');
            
            // 设置默认编辑模式
            this.switchEditMode('raw');
            
            // 绑定事件监听器
            this.bindVariableEditorEvents();
          },

          // 新增：绑定变量修改器事件
          bindVariableEditorEvents() {
            // 标签页切换事件
            document.getElementById('tab-browse').addEventListener('click', () => {
              this.switchTab('browse');
            });
            
            document.getElementById('tab-manual').addEventListener('click', () => {
              this.switchTab('manual');
            });

            // 分类选择事件
            document.getElementById('variable-category').addEventListener('change', (e) => {
              this.handleCategoryChange(e.target.value);
            });

            // 加载变量按钮（手动模式）
            const loadBtn = document.getElementById('load-variable-btn');
            if (loadBtn) {
              loadBtn.addEventListener('click', () => {
                this.loadVariableManual();
              });
            }

            // 操作类型按钮
            document.querySelectorAll('.operation-btn').forEach(btn => {
              btn.addEventListener('click', (e) => {
                this.setOperationType(e.target.dataset.op);
              });
            });

            // 预览命令按钮
            document.getElementById('preview-command-btn').addEventListener('click', () => {
              this.previewMvuCommand();
            });

            // 执行修改按钮
            document.getElementById('execute-command-btn').addEventListener('click', () => {
              this.executeMvuCommand();
            });

            // 编辑模式切换按钮
            document.getElementById('mode-raw').addEventListener('click', () => {
              this.switchEditMode('raw');
            });

            document.getElementById('mode-visual').addEventListener('click', () => {
              this.switchEditMode('visual');
            });

            // 变量路径输入变化时自动预览
            document.getElementById('variable-path').addEventListener('input', () => {
              this.previewMvuCommand();
            });

            // 新值输入变化时自动预览
            document.getElementById('new-variable-value').addEventListener('input', () => {
              this.previewMvuCommand();
              this.updateVisualEditor();
            });

            // 原因输入变化时自动预览
            document.getElementById('change-reason').addEventListener('input', () => {
              this.previewMvuCommand();
            });
          },

          // 新增：标签页切换
          switchTab(tabName) {
            // 更新标签按钮状态
            document.querySelectorAll('.tab-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // 切换显示模式
            const browseMode = document.getElementById('browse-mode');
            const manualMode = document.getElementById('manual-mode');
            
            if (tabName === 'browse') {
              browseMode.style.display = 'block';
              manualMode.style.display = 'none';
            } else {
              browseMode.style.display = 'none';
              manualMode.style.display = 'block';
            }
          },

          // 新增：处理分类选择变化
          handleCategoryChange(category) {
            if (category) {
              this.loadVariablesByCategory(category);
            } else {
              document.getElementById('variable-list').innerHTML = '<div class="placeholder">请选择分类查看变量</div>';
            }
          },

          // 新增：根据分类加载变量列表
          async loadVariablesByCategory(category) {
            const variableList = document.getElementById('variable-list');
            variableList.innerHTML = '<div class="placeholder">正在加载变量...</div>';

            try {
              const messages = await getChatMessages(getCurrentMessageId());
              if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
                variableList.innerHTML = '<div class="placeholder">无法获取变量数据</div>';
                return;
              }

              const stat_data = messages[0].data.stat_data;
              const variables = this.getVariablesByCategory(stat_data, category);
              
              if (variables.length === 0) {
                variableList.innerHTML = '<div class="placeholder">该分类下暂无变量</div>';
                return;
              }

              let html = '';
              variables.forEach(variable => {
                html += `
                  <div class="variable-item" data-path="${variable.path}">
                    <span class="variable-name">${variable.name}</span>
                    <span class="variable-value">${variable.displayValue}</span>
                  </div>
                `;
              });

              variableList.innerHTML = html;

              // 绑定变量项点击事件
              variableList.querySelectorAll('.variable-item').forEach(item => {
                item.addEventListener('click', () => {
                  this.selectVariable(item.dataset.path, item.querySelector('.variable-name').textContent);
                });
              });

            } catch (error) {
              console.error('加载变量列表时出错:', error);
              variableList.innerHTML = '<div class="placeholder">加载变量时出错</div>';
            }
          },

          // 新增：根据分类获取变量
          getVariablesByCategory(stat_data, category) {
            const variables = [];

            switch (category) {
              case 'attributes':
                // 基础属性
                ['法力', '神海', '道心', '空速', '气运'].forEach(attr => {
                  const value = this.SafeGetValue(stat_data, attr);
                  if (value !== undefined) {
                    variables.push({
                      name: attr,
                      path: attr,
                      value: value,
                      displayValue: this.formatDisplayValue(value)
                    });
                  }
                });
                // 当前属性
                ['当前法力', '当前神海', '当前道心', '当前空速'].forEach(attr => {
                  const value = this.SafeGetValue(stat_data, attr);
                  if (value !== undefined) {
                    variables.push({
                      name: attr,
                      path: attr,
                      value: value,
                      displayValue: this.formatDisplayValue(value)
                    });
                  }
                });
                break;

              case 'cultivation':
                ['当前境界', '境界映射', '修为进度', '修为瓶颈'].forEach(attr => {
                  const value = this.SafeGetValue(stat_data, attr);
                  if (value !== undefined) {
                    variables.push({
                      name: attr,
                      path: attr,
                      value: value,
                      displayValue: this.formatDisplayValue(value)
                    });
                  }
                });
                break;

              case 'equipment':
                ['主修功法', '辅修心法', '武器', '防具', '饰品', '法宝栏'].forEach(attr => {
                  const value = this.SafeGetValue(stat_data, attr);
                  variables.push({
                    name: attr,
                    path: attr,
                    value: value,
                    displayValue: this.formatDisplayValue(value)
                  });
                });
                break;

              case 'items':
                ['武器列表', '防具列表', '饰品列表', '法宝列表', '丹药列表', '其他列表'].forEach(listName => {
                  const list = this.SafeGetValue(stat_data, listName);
                  if (list && typeof list === 'object') {
                    Object.keys(list).forEach(itemName => {
                      if (itemName !== '$meta') {
                        variables.push({
                          name: `${listName}.${itemName}`,
                          path: `${listName}.${itemName}`,
                          value: list[itemName],
                          displayValue: this.formatDisplayValue(list[itemName])
                        });
                      }
                    });
                  }
                });
                break;

              case 'relationships':
                const relationships = this.SafeGetValue(stat_data, '人物关系列表');
                if (relationships && typeof relationships === 'object') {
                  Object.keys(relationships).forEach(personName => {
                    if (personName !== '$meta') {
                      variables.push({
                        name: `人物关系列表.${personName}`,
                        path: `人物关系列表.${personName}`,
                        value: relationships[personName],
                        displayValue: this.formatDisplayValue(relationships[personName])
                      });
                    }
                  });
                }
                break;

              case 'world':
                ['当前第x世', '当前时间纪年', '归墟空间', '本世归墟选择', '归墟充能时间',
                 '心理年龄', '心理年龄上限', '生理年龄', '生理年龄上限', '当前位置'].forEach(attr => {
                  const value = this.SafeGetValue(stat_data, attr);
                  if (value !== undefined) {
                    variables.push({
                      name: attr,
                      path: attr,
                      value: value,
                      displayValue: this.formatDisplayValue(value)
                    });
                  }
                });
                break;
            }

            return variables;
          },

          // 新增：格式化显示值
          formatDisplayValue(value) {
            if (value === null || value === undefined) {
              return '未设置';
            }
            if (typeof value === 'object') {
              if (Array.isArray(value)) {
                return `[${value.length}项]`;
              }
              return `{${Object.keys(value).length}项}`;
            }
            const str = String(value);
            return str.length > 30 ? str.substring(0, 30) + '...' : str;
          },

          // 新增：选择变量
          selectVariable(path, name) {
            // 更新选中状态
            document.querySelectorAll('.variable-item').forEach(item => {
              item.classList.remove('selected');
            });
            const selectedItem = document.querySelector(`[data-path="${path}"]`);
            if (selectedItem) {
              selectedItem.classList.add('selected');
            }

            // 设置当前选中的变量路径
            this.currentSelectedPath = path;
            this.currentSelectedName = name;
            this.currentVariablePath = path;

            // 将路径设置到手动模式的输入框中
            const pathInput = document.getElementById('variable-path');
            if (pathInput) {
              pathInput.value = path;
            }

            // 自动加载变量值
            this.loadVariableFromPath(path);
          },

          // 新增：从路径加载变量
          async loadVariableFromPath(path) {
            try {
              console.log('[变量编辑器] 开始加载变量路径:', path);
              
              const messages = await getChatMessages(getCurrentMessageId());
              if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
                document.getElementById('current-variable-value').textContent = '无法获取变量数据';
                return;
              }

              const stat_data = messages[0].data.stat_data;
              const value = this.getVariableByPath(stat_data, path);
              
              console.log('[变量编辑器] 获取到变量值:', value, '类型:', typeof value);
              
              document.getElementById('current-variable-value').textContent =
                value !== undefined ? JSON.stringify(value, null, 2) : '变量不存在';
              
              // 同时更新手动模式的值输入框
              const valueInput = document.getElementById('variable-value');
              if (valueInput) {
                if (value === null) {
                  valueInput.value = 'null';
                } else if (value === undefined) {
                  valueInput.value = 'undefined';
                } else if (typeof value === 'string') {
                  valueInput.value = value;
                } else {
                  valueInput.value = JSON.stringify(value, null, 2);
                }
              }
              
              this.currentVariableValue = value;
              this.currentVariablePath = path;
              this.previewMvuCommand();
              
              console.log('[变量编辑器] 当前编辑模式:', this.currentEditMode);
              
              // 如果当前是可视化模式，更新可视化编辑器
              if (this.currentEditMode === 'visual') {
                console.log('[变量编辑器] 触发可视化编辑器更新');
                this.updateVisualEditor();
              }
              
            } catch (error) {
              console.error('加载变量时出错:', error);
              document.getElementById('current-variable-value').textContent = `加载出错: ${error.message}`;
            }
          },

          // 新增：手动模式加载变量
          loadVariableManual() {
            const pathInput = document.getElementById('variable-path');
            if (!pathInput) return;
            
            const path = pathInput.value.trim();
            if (!path) {
              alert('请输入变量路径');
              return;
            }

            this.loadVariableFromPath(path);
          },

          // 新增：从模板选择变量
          selectVariableFromTemplate(path) {
            // 切换到手动模式
            this.switchTab('manual');
            
            // 设置路径
            const pathInput = document.getElementById('variable-path');
            if (pathInput) {
              pathInput.value = path;
              this.loadVariableManual();
            }
          },

          // 新增：设置操作类型
          setOperationType(opType) {
            // 更新按钮状态
            document.querySelectorAll('.operation-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            document.getElementById(`op-${opType}`).classList.add('active');
            
            // 更新界面显示
            const newValueContainer = document.querySelector('.new-value-input');
            const newValueLabel = newValueContainer.querySelector('label');
            const newValueTextarea = document.getElementById('new-variable-value');
            
            switch(opType) {
              case 'set':
                newValueLabel.textContent = '新值:';
                newValueTextarea.placeholder = '输入新的值，支持JSON格式';
                break;
              case 'add':
                newValueLabel.textContent = '增量值:';
                newValueTextarea.placeholder = '输入要增加的数值（正数或负数）';
                break;
              case 'assign':
                newValueLabel.textContent = '要分配的值:';
                newValueTextarea.placeholder = '输入要分配的值或对象';
                break;
              case 'remove':
                newValueLabel.textContent = '要移除的值:';
                newValueTextarea.placeholder = '输入要移除的键名或索引（可选）';
                break;
            }
            
            this.currentOperation = opType;
            this.previewMvuCommand();
          },

          // 新增：加载变量
          async loadVariable() {
            const path = document.getElementById('variable-path').value.trim();
            if (!path) {
              alert('请输入变量路径');
              return;
            }

            try {
              const messages = await getChatMessages(getCurrentMessageId());
              if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
                document.getElementById('current-variable-value').textContent = '无法获取变量数据';
                return;
              }

              const stat_data = messages[0].data.stat_data;
              const value = this.getVariableByPath(stat_data, path);
              
              document.getElementById('current-variable-value').textContent =
                value !== undefined ? JSON.stringify(value, null, 2) : '变量不存在';
              
              this.currentVariableValue = value;
              this.previewMvuCommand();
              
            } catch (error) {
              console.error('加载变量时出错:', error);
              document.getElementById('current-variable-value').textContent = `加载出错: ${error.message}`;
            }
          },

          // 新增：根据路径获取变量值（兼容数组格式变量）
          getVariableByPath(data, path) {
            try {
              // 使用SafeGetValue处理路径
              const value = this.SafeGetValue(data, path);
              
              // 如果是数组格式的变量（如[值, "描述"]），返回第一个元素
              if (Array.isArray(value) && value.length >= 1) {
                return value[0];
              }
              
              return value;
            } catch (error) {
              console.error('获取变量值时出错:', error);
              return undefined;
            }
          },

          // 新增：预览MVU命令（兼容UpdateVariable格式）
          previewMvuCommand() {
            const path = document.getElementById('variable-path').value.trim();
            const newValue = document.getElementById('new-variable-value').value.trim();
            const reason = document.getElementById('change-reason').value.trim();
            const operation = this.currentOperation || 'set';
            
            if (!path) {
              document.getElementById('mvu-command-preview').textContent = '请先输入变量路径';
              return;
            }

            let command = '';
            const reasonComment = reason ? `//${reason}` : '';
            
            // 检查是否是数组格式变量（需要[0]访问）
            const needsArrayAccess = this.isArrayFormatVariable(path);
            const actualPath = needsArrayAccess ? `${path}[0]` : path;
            
            switch(operation) {
              case 'set':
                if (newValue) {
                  if (this.currentVariableValue !== undefined) {
                    command = `_.set('${actualPath}', ${JSON.stringify(this.currentVariableValue)}, ${this.parseValue(newValue)});${reasonComment}`;
                  } else {
                    command = `_.set('${actualPath}', ${this.parseValue(newValue)});${reasonComment}`;
                  }
                } else {
                  command = '请输入新值';
                }
                break;
              case 'add':
                if (newValue) {
                  command = `_.add('${actualPath}', ${this.parseValue(newValue)});${reasonComment}`;
                } else {
                  command = '请输入增量值';
                }
                break;
              case 'assign':
                if (path.includes('列表') && newValue) {
                  // 对于列表类型，需要提供键和值
                  try {
                    const valueObj = JSON.parse(newValue);
                    if (typeof valueObj === 'object' && valueObj.name) {
                      command = `_.assign('${path}', '${valueObj.name}', ${newValue});${reasonComment}`;
                    } else {
                      command = `_.assign('${path}', ${this.parseValue(newValue)});${reasonComment}`;
                    }
                  } catch (e) {
                    command = `_.assign('${path}', ${this.parseValue(newValue)});${reasonComment}`;
                  }
                } else if (newValue) {
                  command = `_.assign('${actualPath}', ${this.parseValue(newValue)});${reasonComment}`;
                } else {
                  command = '请输入要分配的值';
                }
                break;
              case 'remove':
                if (newValue) {
                  command = `_.remove('${path}', ${this.parseValue(newValue)});${reasonComment}`;
                } else {
                  command = `_.remove('${actualPath}');${reasonComment}`;
                }
                break;
            }
            
            document.getElementById('mvu-command-preview').textContent = command;
          },

          // 新增：检查是否是数组格式变量
          isArrayFormatVariable(path) {
            const arrayFormatVars = [
              '当前境界', '境界映射', '修为进度', '修为瓶颈',
              '当前第x世', '当前时间纪年', '归墟空间', '本世归墟选择',
              '归墟充能时间', '心理年龄', '心理年龄上限', '生理年龄', '生理年龄上限'
            ];
            return arrayFormatVars.includes(path);
          },

          // 新增：解析输入值
          parseValue(valueStr) {
            if (!valueStr) return 'null';
            
            // 尝试解析为JSON
            try {
              JSON.parse(valueStr);
              return valueStr;
            } catch (e) {
              // 如果不是有效的JSON，作为字符串处理
              return JSON.stringify(valueStr);
            }
          },

          // 新增：执行MVU命令
          async executeMvuCommand() {
            const command = document.getElementById('mvu-command-preview').textContent;
            
            if (!command || command.includes('请')) {
              alert('请先完善变量信息并预览命令');
              return;
            }

            try {
              // 确认执行
              if (!confirm(`确定要执行以下MVU命令吗？\n\n${command}`)) {
                return;
              }

              // 这里集成MVU命令执行功能
              await this.executeMvuCommandDirect(command);
              
              alert('变量修改成功！');
              this.closeModal('variable-editor-modal');
              
              // 刷新相关界面
              if (this.currentMvuState && this.currentMvuState.stat_data) {
                this.renderUI(this.currentMvuState.stat_data);
              }
              
            } catch (error) {
              console.error('执行MVU命令时出错:', error);
              alert(`执行失败: ${error.message}`);
            }
          },

          // 新增：直接执行MVU命令的方法 (已更新支持静默和非持久化模式)
          async executeMvuCommandDirect(command, options = { silent: false, persist: true }) {
            console.log(`[变量修改器] 执行MVU命令: ${command}`, `(Silent: ${options.silent}, Persist: ${options.persist})`);
            
            if (!this.currentMvuState) {
              throw new Error('MVU状态不可用，请先进行一次游戏操作');
            }

            // 使用现有的MVU执行逻辑
            const inputData = { old_variables: this.currentMvuState };
            let mvuSucceeded = false;
            
            try {
              // 首先尝试调用后端MVU事件
              const mvuPromise = eventEmit('mag_invoke_mvu', command, inputData);
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MVU event timeout')), 3000)
              );
              
              await Promise.race([mvuPromise, timeoutPromise]);
              
              if (inputData.new_variables) {
                this.currentMvuState = this._safeLoadMvuData(inputData.new_variables);
                if (!options.silent) {
                    this.renderUI(this.currentMvuState.stat_data);
                }
                mvuSucceeded = true;
                console.log('[变量修改器] MVU后端执行成功');
              } else {
                console.log('[变量修改器] MVU后端未返回新状态，尝试前端备用方案');
              }
            } catch (eventError) {
              console.error('[变量修改器] 调用MVU事件时发生错误或超时，尝试前端备用方案:', eventError);
            }

            // 如果后端执行失败，使用前端备用方案
            if (!mvuSucceeded) {
              const modifiedState = this._applyUpdateFallback(command, this.currentMvuState);
              if (modifiedState) {
                this.currentMvuState = modifiedState;
                if (!options.silent) {
                    this.renderUI(this.currentMvuState.stat_data);
                }
                console.log('[变量修改器] 前端备用方案执行成功');
              } else {
                throw new Error('MVU命令执行失败：后端和前端方案都无法处理该命令');
              }
            }

            // 关键：将修改后的数据保存到消息中，确保数据持久化 (除非指定不持久化)
            if (options.persist) {
              await this.saveVariableChangesToMessage();
            }

            // 重新加载变量显示当前值
            setTimeout(() => {
              if (this.currentVariablePath) {
                this.loadVariableFromPath(this.currentVariablePath);
              }
              // 如果是浏览模式，刷新变量列表
              const activeTab = document.querySelector('.tab-btn.active');
              if (activeTab && activeTab.id === 'tab-browse') {
                const category = document.getElementById('variable-category').value;
                if (category) {
                  this.loadVariablesByCategory(category);
                }
              }
            }, 100);
          },

          // 新增：将变量修改保存到消息数据中
          async saveVariableChangesToMessage() {
            try {
              const messageId = getCurrentMessageId();
              if (messageId >= 0 && this.currentMvuState) {
                // 使用SillyTavern的标准API保存变量数据
                await setChatMessage(
                  { data: this.currentMvuState },
                  messageId,
                  { refresh: 'display_current' }
                );
                console.log('[变量修改器] 数据已保存到消息中');
                
                // 同时更新聊天级别的变量
                await replaceVariables(this.currentMvuState, { type: 'chat' });
                console.log('[变量修改器] 聊天变量已更新');
              }
            } catch (error) {
              console.error('[变量修改器] 保存数据到消息时出错:', error);
              // 尝试备用保存方法
              try {
                await replaceVariables(this.currentMvuState, {
                  type: 'message',
                  message_id: getCurrentMessageId()
                });
                console.log('[变量修改器] 使用备用方法保存成功');
              } catch (backupError) {
                console.error('[变量修改器] 备用保存方法也失败:', backupError);
              }
            }
          },

          // 新增：编辑模式切换
          switchEditMode(mode) {
            console.log('[变量编辑器] 切换编辑模式到:', mode);
            
            // 更新按钮状态
            document.querySelectorAll('.mode-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            document.getElementById(`mode-${mode}`).classList.add('active');
            
            // 先设置编辑模式
            this.currentEditMode = mode;
            
            // 切换显示内容
            const rawMode = document.getElementById('raw-edit-mode');
            const visualMode = document.getElementById('visual-edit-mode');
            
            if (mode === 'raw') {
              rawMode.style.display = 'block';
              visualMode.style.display = 'none';
            } else {
              rawMode.style.display = 'none';
              visualMode.style.display = 'block';
              console.log('[变量编辑器] 切换到可视化模式，当前变量值:', this.currentVariableValue);
              this.updateVisualEditor();
            }
          },

          // === 重构：智能可视化编辑器 ===
          updateVisualEditor() {
            const visualContent = document.getElementById('visual-editor-content');
            
            if (this.currentEditMode !== 'visual') {
              return;
            }
            
            if (!this.currentVariableValue && this.currentVariableValue !== 0 && this.currentVariableValue !== false) {
              visualContent.innerHTML = '<div class="placeholder">请先加载变量以启用可视化编辑</div>';
              return;
            }

            try {
              const value = this.currentVariableValue;
              console.log('[智能可视化编辑器] 渲染变量值:', value);
              
              // 初始化版本历史和撤销重做系统
              this.initVersionHistory();
              
              const html = this.renderSmartVisualEditor(value, this.currentVariablePath || '根值');
              visualContent.innerHTML = html;
              this.bindSmartEditorEvents();
            } catch (error) {
              console.error('渲染智能可视化编辑器时出错:', error);
              visualContent.innerHTML = `<div class="placeholder">数据解析失败，正在尝试兼容模式...<br>错误: ${error.message}</div>`;
              // 降级到简单模式
              this.renderFallbackEditor(value);
            }
          },

          // 智能数据类型检测和渲染
          renderSmartVisualEditor(value, path) {
            // 检测数据类型并选择合适的渲染器
            const dataType = this.detectDataType(value, path);
            
            switch (dataType) {
              case 'character':
                return this.renderCharacterCard(value, path);
              case 'relationship_list':
                return this.renderRelationshipList(value, path);
              case 'attributes':
                return this.renderAttributesPanel(value, path);
              case 'simple_object':
                return this.renderSimpleObject(value, path);
              case 'array':
                return this.renderSmartArray(value, path);
              case 'primitive':
                return this.renderPrimitiveValue(value, path);
              default:
                return this.renderGenericObject(value, path);
            }
          },

          // 数据类型检测器
          detectDataType(value, path) {
            if (value === null || value === undefined) return 'primitive';
            if (typeof value !== 'object') return 'primitive';
            
            // 检测人物数据
            if (this.isCharacterData(value)) return 'character';
            
            // 检测人物关系列表
            if (path && path.includes('人物关系列表')) return 'relationship_list';
            
            // 检测属性对象
            if (this.isAttributesObject(value)) return 'attributes';
            
            // 检测数组
            if (Array.isArray(value)) return 'array';
            
            // 检测简单对象
            if (this.isSimpleObject(value)) return 'simple_object';
            
            return 'generic_object';
          },

          // 人物数据检测
          isCharacterData(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
            
            const characterFields = ['身份背景', '性格', '外貌', '称呼', 'attributes', 'tier', '等级', 'favorability'];
            const hasCharacterFields = characterFields.some(field => value.hasOwnProperty(field));
            
            return hasCharacterFields;
          },

          // 属性对象检测
          isAttributesObject(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
            
            const keys = Object.keys(value);
            const numericKeys = keys.filter(key => typeof value[key] === 'number');
            
            // 如果大部分字段都是数值，认为是属性对象
            return numericKeys.length > keys.length * 0.6;
          },

          // 简单对象检测
          isSimpleObject(value) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
            
            const keys = Object.keys(value);
            return keys.length <= 10 && keys.every(key =>
              typeof value[key] === 'string' ||
              typeof value[key] === 'number' ||
              typeof value[key] === 'boolean'
            );
          },

          // === 专用渲染器实现 ===
          
          // 人物卡片渲染器
          renderCharacterCard(character, path) {
            const name = character.称呼 || character.name || '未命名角色';
            const identity = character.身份背景 || character.identity || '';
            const tier = character.tier || '';
            const level = character.等级 || character.level || '';
            
            let html = `<div class="character-card" data-path="${path}">
              <div class="character-header">
                <div class="character-avatar">${name.charAt(0)}</div>
                <div class="character-basic-info">
                  <div class="character-name" contenteditable="true" data-field="name">${name}</div>
                  <div class="character-title">${tier} ${level}</div>
                </div>
              </div>`;

            // 属性面板
            if (character.attributes) {
              html += this.renderAttributesPanel(character.attributes, `${path}.attributes`);
            }

            // 基本信息
            html += `<div class="details-section">
              <div class="details-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>基本信息</span>
                <span>▼</span>
              </div>
              <div class="details-content">`;

            const basicFields = [
              { key: '身份背景', label: '身份背景', type: 'textarea' },
              { key: '性格', label: '性格', type: 'textarea' },
              { key: '外貌', label: '外貌', type: 'textarea' },
              { key: 'tier', label: '修为境界', type: 'select', options: ['凡人', '练气', '筑基', '金丹', '元婴', '化神'] },
              { key: '等级', label: '等级', type: 'select', options: ['初期', '中期', '后期', '大圆满'] },
              { key: 'favorability', label: '好感度', type: 'slider', min: -100, max: 100 },
              { key: 'relationship', label: '关系', type: 'text' }
            ];

            basicFields.forEach(field => {
              const value = character[field.key] || '';
              html += this.renderFormField(field, value, `${path}.${field.key}`);
            });

            html += `</div></div>`;

            // 人物关系列表
            if (character.人物关系列表) {
              html += this.renderRelationshipList(character.人物关系列表, `${path}.人物关系列表`);
            }

            // 其他详细信息
            const otherFields = Object.keys(character).filter(key =>
              !['称呼', 'name', '身份背景', '性格', '外貌', 'tier', '等级', 'favorability', 'relationship', 'attributes', '人物关系列表'].includes(key)
            );

            if (otherFields.length > 0) {
              html += `<div class="details-section">
                <div class="details-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                  <span>其他信息</span>
                  <span>▼</span>
                </div>
                <div class="details-content">`;

              otherFields.forEach(key => {
                const value = character[key];
                html += this.renderGenericField(key, value, `${path}.${key}`);
              });

              html += `</div></div>`;
            }

            html += `<div class="action-buttons">
              <button class="action-btn secondary" onclick="guixuApp.revertField('${path}')">撤销</button>
              <button class="action-btn" onclick="guixuApp.saveField('${path}')">保存</button>
            </div></div>`;

            return html;
          },

          // 属性面板渲染器
          renderAttributesPanel(attributes, path) {
            let html = `<div class="attributes-panel" data-path="${path}">`;
            
            Object.entries(attributes).forEach(([key, value]) => {
              const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
              const maxValue = this.getAttributeMaxValue(key, numValue);
              
              html += `<div class="attribute-item">
                <label class="attribute-label">${key}</label>
                <div class="attribute-value">
                  <input type="range" class="attribute-slider"
                         min="0" max="${maxValue}" value="${numValue}"
                         data-path="${path}.${key}" data-type="number">
                  <input type="number" class="attribute-input"
                         value="${numValue}" min="0" max="${maxValue}"
                         data-path="${path}.${key}" data-type="number">
                </div>
              </div>`;
            });
            
            html += `</div>`;
            return html;
          },

          // 关系列表渲染器 - 重构为现有UI风格
          renderRelationshipList(relationships, path) {
            if (!relationships || typeof relationships !== 'object') {
              return `<div class="relationships-container" data-path="${path}">
                <div class="empty-relationships-state">
                  <div class="empty-state-icon">👥</div>
                  <div class="empty-state-title">暂无人物关系</div>
                  <div class="empty-state-description">
                    <p>点击下方按钮添加第一个人物关系</p>
                  </div>
                  <div class="action-buttons">
                    <button class="action-btn" onclick="guixuApp.addRelationship('${path}')">添加关系</button>
                  </div>
                </div>
              </div>`;
            }

            // 使用现有人物关系UI风格
            let html = `<div class="relationships-container" data-path="${path}">
              <div class="relationships-header">
                <div class="relationship-tabs">
                  <div class="tab-btn active">
                    <span class="tab-icon">👥</span>
                    <span class="tab-text">人物关系</span>
                    <span class="tab-count">${Object.keys(relationships).length}</span>
                  </div>
                </div>
                <div class="relationships-controls">
                  <div class="action-buttons">
                    <button class="action-btn" onclick="guixuApp.addRelationship('${path}')">添加关系</button>
                  </div>
                </div>
              </div>
              <div class="relationships-content">
                <div class="relationships-grid">`;

            // 渲染每个人物关系卡片
            Object.entries(relationships).forEach(([name, info]) => {
              html += this.renderSingleRelationshipCard(name, info, path);
            });

            html += `</div></div></div>`;
            return html;
          },

          // 渲染单个人物关系卡片
          renderSingleRelationshipCard(name, info, basePath) {
            const isObject = typeof info === 'object' && info !== null;
            const relationship = isObject ? (info.relationship || '未知关系') : (typeof info === 'string' ? info : '未知关系');
            const favorability = isObject ? (info.favorability || 0) : 0;
            const tier = isObject ? (info.tier || '') : '';
            const level = isObject ? (info.等级 || info.level || '') : '';
            const identity = isObject ? (info.身份背景 || info.identity || '') : '';
            const personality = isObject ? (info.性格 || info.personality || '') : '';
            const appearance = isObject ? (info.外貌 || info.appearance || '') : '';
            const calling = isObject ? (info.称呼 || info.calling || name) : name;

            // 计算好感度进度条宽度
            const favorabilityPercent = Math.max(0, Math.min(100, (favorability + 100) / 2));

            let html = `<div class="relationship-card" data-name="${name}" data-path="${basePath}.${name}">
              <div class="relationship-main">
                <div class="relationship-header">
                  <div class="header-left">
                    <div class="character-name" contenteditable="true" data-field="name" data-original-name="${name}">${name}</div>
                    <div class="character-relationship">${relationship}</div>
                  </div>
                  <div class="cultivation-info">${tier} ${level}</div>
                </div>

                <div class="favorability-section">
                  <div class="favorability-value">好感度: ${favorability}</div>
                  <div class="favorability-bar">
                    <div class="favorability-progress" style="width: ${favorabilityPercent}%"></div>
                  </div>
                </div>`;

            // 基本信息编辑区域
            html += `<div class="relationship-details">
              <button class="details-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                基本信息
              </button>
              <div class="details-content hidden">
                <div class="details-row">
                  <div class="smart-form-group">
                    <label class="smart-form-label">称呼</label>
                    <input type="text" class="attribute-input" value="${calling}"
                           data-path="${basePath}.${name}.称呼" data-field="称呼">
                  </div>
                  <div class="smart-form-group">
                    <label class="smart-form-label">关系</label>
                    <input type="text" class="attribute-input" value="${relationship}"
                           data-path="${basePath}.${name}.relationship" data-field="relationship">
                  </div>
                  <div class="smart-form-group">
                    <label class="smart-form-label">修为境界</label>
                    <select class="smart-select" data-path="${basePath}.${name}.tier" data-field="tier">
                      <option value="">选择境界</option>
                      <option value="凡人" ${tier === '凡人' ? 'selected' : ''}>凡人</option>
                      <option value="练气" ${tier === '练气' ? 'selected' : ''}>练气</option>
                      <option value="筑基" ${tier === '筑基' ? 'selected' : ''}>筑基</option>
                      <option value="金丹" ${tier === '金丹' ? 'selected' : ''}>金丹</option>
                      <option value="元婴" ${tier === '元婴' ? 'selected' : ''}>元婴</option>
                      <option value="化神" ${tier === '化神' ? 'selected' : ''}>化神</option>
                      <option value="合体" ${tier === '合体' ? 'selected' : ''}>合体</option>
                      <option value="飞升" ${tier === '飞升' ? 'selected' : ''}>飞升</option>
                    </select>
                  </div>
                  <div class="smart-form-group">
                    <label class="smart-form-label">等级</label>
                    <select class="smart-select" data-path="${basePath}.${name}.等级" data-field="等级">
                      <option value="">选择等级</option>
                      <option value="初期" ${level === '初期' ? 'selected' : ''}>初期</option>
                      <option value="中期" ${level === '中期' ? 'selected' : ''}>中期</option>
                      <option value="后期" ${level === '后期' ? 'selected' : ''}>后期</option>
                      <option value="大圆满" ${level === '大圆满' ? 'selected' : ''}>大圆满</option>
                    </select>
                  </div>
                  <div class="smart-form-group">
                    <label class="smart-form-label">好感度 (${favorability})</label>
                    <div class="attribute-value">
                      <input type="range" class="attribute-slider" min="-100" max="100" value="${favorability}"
                             data-path="${basePath}.${name}.favorability" data-field="favorability" data-type="number">
                      <input type="number" class="attribute-input" value="${favorability}" min="-100" max="100"
                             data-path="${basePath}.${name}.favorability" data-field="favorability" data-type="number" style="width: 80px;">
                    </div>
                  </div>
                </div>
              </div>
            </div>`;

            // 详细信息编辑区域
            if (identity || personality || appearance) {
              html += `<div class="relationship-details">
                <button class="details-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                  详细信息
                </button>
                <div class="details-content hidden">
                  <div class="details-row">`;

              if (identity) {
                html += `<div class="smart-form-group">
                  <label class="smart-form-label">身份背景</label>
                  <textarea class="rich-text-editor" data-path="${basePath}.${name}.身份背景" data-field="身份背景" rows="3">${identity}</textarea>
                </div>`;
              }

              if (personality) {
                html += `<div class="smart-form-group">
                  <label class="smart-form-label">性格</label>
                  <textarea class="rich-text-editor" data-path="${basePath}.${name}.性格" data-field="性格" rows="2">${personality}</textarea>
                </div>`;
              }

              if (appearance) {
                html += `<div class="smart-form-group">
                  <label class="smart-form-label">外貌</label>
                  <textarea class="rich-text-editor" data-path="${basePath}.${name}.外貌" data-field="外貌" rows="2">${appearance}</textarea>
                </div>`;
              }

              html += `</div></div></div>`;
            }

            // 操作按钮
            html += `<div class="action-buttons">
              <button class="action-btn secondary" onclick="guixuApp.removeRelationship('${basePath}', '${name}')">删除</button>
              <button class="action-btn" onclick="guixuApp.saveRelationshipChanges('${basePath}', '${name}')">保存修改</button>
            </div>`;

            html += `</div></div>`;
            return html;
          },

          // 表单字段渲染器
          renderFormField(field, value, path) {
            let html = `<div class="smart-form-group">
              <label class="smart-form-label">${field.label}</label>`;

            switch (field.type) {
              case 'textarea':
                html += `<textarea class="rich-text-editor" data-path="${path}" rows="3">${value}</textarea>`;
                break;
              case 'select':
                html += `<select class="smart-select" data-path="${path}">`;
                field.options.forEach(option => {
                  const selected = option === value ? 'selected' : '';
                  html += `<option value="${option}" ${selected}>${option}</option>`;
                });
                html += `</select>`;
                break;
              case 'slider':
                const numValue = typeof value === 'number' ? value : parseInt(value) || field.min || 0;
                html += `<div class="attribute-value">
                  <input type="range" class="attribute-slider"
                         min="${field.min}" max="${field.max}" value="${numValue}"
                         data-path="${path}" data-type="number">
                  <input type="number" class="attribute-input"
                         value="${numValue}" min="${field.min}" max="${field.max}"
                         data-path="${path}" data-type="number">
                </div>`;
                break;
              default:
                html += `<input type="text" class="attribute-input" value="${value}" data-path="${path}">`;
            }

            html += `</div>`;
            return html;
          },

          // 通用字段渲染器
          renderGenericField(key, value, path) {
            if (typeof value === 'object' && value !== null) {
              return `<div class="smart-form-group">
                <label class="smart-form-label">${key}</label>
                <textarea class="rich-text-editor" data-path="${path}" rows="2">${JSON.stringify(value, null, 2)}</textarea>
              </div>`;
            } else {
              return `<div class="smart-form-group">
                <label class="smart-form-label">${key}</label>
                <input type="text" class="attribute-input" value="${value}" data-path="${path}">
              </div>`;
            }
          },

          // 获取属性最大值
          getAttributeMaxValue(attributeName, currentValue) {
            const maxValues = {
              '法力': Math.max(10000, currentValue * 2),
              '神海': Math.max(1000, currentValue * 2),
              '道心': 100,
              '空速': 100,
              '气运': 100,
              '体质': 100,
              '灵根': 100
            };
            return maxValues[attributeName] || Math.max(1000, currentValue * 2);
          },

          // 降级渲染器（兼容模式）
          renderFallbackEditor(value) {
            const visualContent = document.getElementById('visual-editor-content');
            try {
              const html = this.renderVisualEditor(value, this.currentVariablePath || '根值');
              visualContent.innerHTML = html;
              this.bindVisualEditorEvents();
            } catch (error) {
              visualContent.innerHTML = `<div class="placeholder">
                数据格式过于复杂，请使用原始模式编辑<br>
                <button class="action-btn" onclick="guixuApp.switchEditMode('raw')">切换到原始模式</button>
              </div>`;
            }
          },

          // === 智能事件绑定系统 ===
          bindSmartEditorEvents() {
            // 绑定所有输入控件
            this.bindInputEvents();
            this.bindSliderEvents();
            this.bindContentEditableEvents();
            this.bindSelectEvents();
            
            // 绑定操作按钮
            this.bindActionButtons();
            
            console.log('[智能编辑器] 事件绑定完成');
          },

          // 绑定输入框事件
          bindInputEvents() {
            document.querySelectorAll('.attribute-input, .rich-text-editor').forEach(input => {
              input.addEventListener('input', (e) => {
                this.handleFieldChange(e.target);
              });
              
              input.addEventListener('blur', (e) => {
                this.saveFieldChange(e.target);
              });
            });
          },

          // 绑定滑块事件
          bindSliderEvents() {
            document.querySelectorAll('.attribute-slider').forEach(slider => {
              slider.addEventListener('input', (e) => {
                // 同步对应的数字输入框
                const path = e.target.dataset.path;
                const numberInput = document.querySelector(`input[type="number"][data-path="${path}"]`);
                if (numberInput) {
                  numberInput.value = e.target.value;
                }
                this.handleFieldChange(e.target);
              });
              
              slider.addEventListener('change', (e) => {
                this.saveFieldChange(e.target);
              });
            });

            // 绑定数字输入框与滑块的双向同步
            document.querySelectorAll('input[type="number"][data-path]').forEach(input => {
              input.addEventListener('input', (e) => {
                const path = e.target.dataset.path;
                const slider = document.querySelector(`.attribute-slider[data-path="${path}"]`);
                if (slider) {
                  slider.value = e.target.value;
                }
                this.handleFieldChange(e.target);
              });
            });
          },

          // 绑定可编辑内容事件
          bindContentEditableEvents() {
            document.querySelectorAll('[contenteditable="true"]').forEach(element => {
              element.addEventListener('input', (e) => {
                this.handleContentEditableChange(e.target);
              });
              
              element.addEventListener('blur', (e) => {
                this.saveContentEditableChange(e.target);
              });
              
              // 防止换行
              element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.target.blur();
                }
              });
            });
          },

          // 绑定下拉选择事件
          bindSelectEvents() {
            document.querySelectorAll('.smart-select').forEach(select => {
              select.addEventListener('change', (e) => {
                this.handleFieldChange(e.target);
                this.saveFieldChange(e.target);
              });
            });
          },

          // 绑定操作按钮事件
          bindActionButtons() {
            // 这些按钮通过onclick属性绑定，这里可以添加额外的全局事件处理
          },

          // === 字段变更处理 ===
          handleFieldChange(element) {
            const path = element.dataset.path;
            const field = element.dataset.field;
            const value = this.parseInputValue(element);
            
            if (path) {
              // 实时更新内部数据
              this.updateFieldValue(path, value);
              
              // 特殊处理：如果是好感度滑块，同步更新进度条
              if (field === 'favorability') {
                this.updateFavorabilityBar(element, value);
              }
              
              // 更新原始JSON显示
              this.updateRawValueFromVisual();
              
              // 标记为已修改
              element.classList.add('modified');
              
              console.log(`[字段变更] ${path} = ${value}`);
            }
          },

          // 保存字段变更
          saveFieldChange(element) {
            const path = element.dataset.path;
            const field = element.dataset.field;
            if (path) {
              // 创建版本历史记录
              this.createVersionSnapshot(`修改字段: ${path}`);
              
              // 移除修改标记
              element.classList.remove('modified');
              
              console.log(`[字段保存] ${path}`);
            }
          },

          // 更新好感度进度条
          updateFavorabilityBar(element, value) {
            const card = element.closest('.relationship-card');
            if (card) {
              const progressBar = card.querySelector('.favorability-progress');
              const valueDisplay = card.querySelector('.favorability-value');
              if (progressBar && valueDisplay) {
                const percent = Math.max(0, Math.min(100, (parseInt(value) + 100) / 2));
                progressBar.style.width = `${percent}%`;
                valueDisplay.textContent = `好感度: ${value}`;
              }
            }
          },

          // === 人物关系操作函数 ===
          
          // 添加新的人物关系
          addRelationship(basePath) {
            const name = prompt('请输入人物姓名:');
            if (!name || !name.trim()) return;
            
            const trimmedName = name.trim();
            
            // 检查是否已存在
            if (this.currentVariableValue && this.currentVariableValue[trimmedName]) {
              alert('该人物已存在！');
              return;
            }
            
            // 创建新的人物关系对象
            const newRelationship = {
              称呼: trimmedName,
              relationship: '陌生人',
              favorability: 0,
              tier: '',
              等级: '',
              身份背景: '',
              性格: '',
              外貌: ''
            };
            
            // 更新数据
            if (!this.currentVariableValue) {
              this.currentVariableValue = {};
            }
            this.currentVariableValue[trimmedName] = newRelationship;
            
            // 创建版本快照
            this.createVersionSnapshot(`添加人物关系: ${trimmedName}`);
            
            // 重新渲染
            this.updateVisualEditor();
            
            console.log(`[添加关系] ${trimmedName}`, newRelationship);
          },

          // 删除人物关系
          removeRelationship(basePath, name) {
            if (!confirm(`确定要删除人物关系"${name}"吗？`)) return;
            
            if (this.currentVariableValue && this.currentVariableValue[name]) {
              delete this.currentVariableValue[name];
              
              // 创建版本快照
              this.createVersionSnapshot(`删除人物关系: ${name}`);
              
              // 重新渲染
              this.updateVisualEditor();
              
              console.log(`[删除关系] ${name}`);
            }
          },

          // 保存人物关系修改
          saveRelationshipChanges(basePath, originalName) {
            const card = document.querySelector(`[data-name="${originalName}"]`);
            if (!card) return;
            
            // 收集所有修改的字段
            const modifiedElements = card.querySelectorAll('.modified');
            if (modifiedElements.length === 0) {
              alert('没有检测到修改！');
              return;
            }
            
            // 生成MVU命令
            const commands = this.generateRelationshipMvuCommands(basePath, originalName, modifiedElements);
            
            if (commands.length === 0) {
              alert('没有生成有效的MVU命令！');
              return;
            }
            
            // 显示命令预览
            const commandText = commands.join('\n');
            if (confirm(`将执行以下MVU命令：\n\n${commandText}\n\n确定执行吗？`)) {
              this.executeMultipleMvuCommands(commands);
            }
          },

          // 生成人物关系MVU命令
          generateRelationshipMvuCommands(basePath, originalName, modifiedElements) {
            const commands = [];
            
            modifiedElements.forEach(element => {
              const path = element.dataset.path;
              const field = element.dataset.field;
              const value = this.parseInputValue(element);
              
              if (!path || !field) return;
              
              // 智能判断使用set还是assign
              const command = this.generateSmartMvuCommand(path, field, value, originalName);
              if (command) {
                commands.push(command);
              }
            });
            
            return commands;
          },

          // 智能生成MVU命令
          generateSmartMvuCommand(path, field, value, characterName) {
            // 解析路径，确定是否是人物关系列表
            const isRelationshipList = path.includes('人物关系列表');
            
            if (isRelationshipList) {
              // 对于人物关系列表，使用assign命令
              const cleanPath = path.replace(/\.人物关系列表\.[^.]+\./, '.人物关系列表.');
              const fieldPath = `人物关系列表.${characterName}.${field}`;
              
              // 根据字段类型决定值的格式
              let formattedValue;
              if (typeof value === 'string') {
                formattedValue = `"${value}"`;
              } else if (typeof value === 'number') {
                formattedValue = value.toString();
              } else {
                formattedValue = JSON.stringify(value);
              }
              
              return `_.assign('${fieldPath}', ${formattedValue}); // 修改${characterName}的${field}`;
            } else {
              // 对于其他情况，使用set命令
              let formattedValue;
              if (typeof value === 'string') {
                formattedValue = `"${value}"`;
              } else if (typeof value === 'number') {
                formattedValue = value.toString();
              } else {
                formattedValue = JSON.stringify(value);
              }
              
              return `_.set('${path}', ${formattedValue}); // 修改${field}`;
            }
          },

          // 执行多个MVU命令
          async executeMultipleMvuCommands(commands) {
            try {
              for (const command of commands) {
                await this.executeMvuCommandDirect(command);
                // 短暂延迟，避免命令冲突
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              alert('所有修改已成功保存！');
              
              // 清除所有修改标记
              document.querySelectorAll('.modified').forEach(el => {
                el.classList.remove('modified');
              });
              
              // 重新加载数据
              if (this.currentVariablePath) {
                setTimeout(() => {
                  this.loadVariableFromPath(this.currentVariablePath);
                }, 500);
              }
              
            } catch (error) {
              console.error('执行MVU命令时出错:', error);
              alert(`保存失败: ${error.message}`);
            }
          },

          // 处理可编辑内容变更
          handleContentEditableChange(element) {
            const field = element.dataset.field;
            const value = element.textContent.trim();
            
            if (field === 'name') {
              // 特殊处理名称变更
              this.handleNameChange(element, value);
            }
          },

          // 保存可编辑内容变更
          saveContentEditableChange(element) {
            const field = element.dataset.field;
            const value = element.textContent.trim();
            
            if (field === 'name') {
              this.createVersionSnapshot(`修改名称: ${value}`);
            }
          },

          // 解析输入值
          parseInputValue(element) {
            const value = element.value;
            const type = element.dataset.type;
            
            switch (type) {
              case 'number':
                return parseFloat(value) || 0;
              case 'boolean':
                return value === 'true' || value === '1';
              default:
                return value;
            }
          },

          // 更新字段值
          updateFieldValue(path, value) {
            try {
              this.setValueByPath(this.currentVariableValue, path, value);
            } catch (error) {
              console.error(`[字段更新失败] ${path}:`, error);
            }
          },

          // 从可视化编辑器更新原始值显示
          updateRawValueFromVisual() {
            const rawTextarea = document.getElementById('new-variable-value');
            if (rawTextarea && this.currentVariableValue !== undefined) {
              try {
                rawTextarea.value = JSON.stringify(this.currentVariableValue, null, 2);
                this.previewMvuCommand();
              } catch (error) {
                console.error('更新原始值显示失败:', error);
              }
            }
          },

          // 路径值设置工具函数
          setValueByPath(obj, path, value) {
            // 移除基础路径前缀（如果存在）
            const cleanPath = path.replace(/^[^.]+\./, '');
            const keys = cleanPath.split('.');
            let current = obj;
            
            // 导航到目标对象
            for (let i = 0; i < keys.length - 1; i++) {
              const key = keys[i];
              if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
              }
              current = current[key];
            }
            
            // 设置最终值
            const finalKey = keys[keys.length - 1];
            current[finalKey] = value;
          },

          // 路径值获取工具函数
          getValueByPath(obj, path) {
            const cleanPath = path.replace(/^[^.]+\./, '');
            const keys = cleanPath.split('.');
            let current = obj;
            
            for (const key of keys) {
              if (current === null || current === undefined || !(key in current)) {
                return undefined;
              }
              current = current[key];
            }
            
            return current;
          },

          // === 版本历史和撤销重做系统 ===
          initVersionHistory() {
            if (!this.versionHistory) {
              this.versionHistory = [];
              this.currentVersionIndex = -1;
            }
            
            // 创建初始版本
            if (this.versionHistory.length === 0) {
              this.createVersionSnapshot('初始状态', false);
            }
            
            // 初始化历史记录面板
            this.initHistoryPanel();
          },

          // 初始化历史记录面板
          initHistoryPanel() {
            const visualContent = document.getElementById('visual-editor-content');
            if (!visualContent) return;
            
            // 创建历史记录面板容器
            let historyPanel = document.getElementById('version-history-panel');
            if (!historyPanel) {
              historyPanel = document.createElement('div');
              historyPanel.id = 'version-history-panel';
              historyPanel.className = 'version-history-panel';
              historyPanel.innerHTML = `
                <div class="history-panel-header">
                  <h4>修改历史</h4>
                  <button class="history-toggle-btn" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
                    <span>▼</span>
                  </button>
                </div>
                <div class="history-panel-content">
                  <div class="history-list" id="version-history-list">
                    
                  </div>
                  <div class="history-actions">
                    <button class="action-btn secondary" onclick="guixuApp.clearHistory()">清空历史</button>
                  </div>
                </div>
              `;
              
              // 将历史面板插入到可视化编辑器旁边
              const visualMode = document.getElementById('visual-edit-mode');
              if (visualMode) {
                visualMode.appendChild(historyPanel);
              }
            }
            
            this.updateVersionHistoryUI();
          },

          // 撤销操作
          undo() {
            if (this.currentVersionIndex > 0) {
              this.currentVersionIndex--;
              const version = this.versionHistory[this.currentVersionIndex];
              this.restoreVersion(version);
              console.log(`[撤销] 恢复到: ${version.description}`);
            }
          },

          // 重做操作
          redo() {
            if (this.currentVersionIndex < this.versionHistory.length - 1) {
              this.currentVersionIndex++;
              const version = this.versionHistory[this.currentVersionIndex];
              this.restoreVersion(version);
              console.log(`[重做] 恢复到: ${version.description}`);
            }
          },

          // 恢复到指定版本
          restoreVersion(version) {
            this.currentVariableValue = JSON.parse(JSON.stringify(version.data));
            this.updateVisualEditor();
            this.updateRawValueFromVisual();
            this.updateVersionHistoryUI();
          },

          // 更新版本历史UI
          updateVersionHistoryUI() {
            const historyList = document.getElementById('version-history-list');
            if (!historyList || !this.versionHistory) return;

            // 清空现有内容
            historyList.innerHTML = '';

            // 如果没有历史记录，显示提示
            if (this.versionHistory.length === 0) {
              historyList.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">暂无历史记录</div>';
              return;
            }

            // 渲染历史记录列表（倒序显示，最新的在上面）
            for (let i = this.versionHistory.length - 1; i >= 0; i--) {
              const version = this.versionHistory[i];
              const isCurrent = i === this.currentVersionIndex;
              
              const historyItem = document.createElement('div');
              historyItem.className = `history-item ${isCurrent ? 'current' : ''}`;
              historyItem.dataset.index = i;
              
              // 格式化时间
              const time = new Date(version.timestamp).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              
              historyItem.innerHTML = `
                <div class="history-item-info">
                  <div class="history-item-description">${version.description}</div>
                  <div class="history-item-time">${time}</div>
                </div>
              `;
              
              // 添加点击事件
              historyItem.addEventListener('click', () => {
                this.restoreToVersion(parseInt(historyItem.dataset.index));
              });
              
              historyList.appendChild(historyItem);
            }

            console.log(`[版本历史] 当前版本: ${this.currentVersionIndex + 1}/${this.versionHistory.length}`);
          },

          // 恢复到指定版本
          restoreToVersion(versionIndex) {
            if (versionIndex >= 0 && versionIndex < this.versionHistory.length) {
              this.currentVersionIndex = versionIndex;
              const version = this.versionHistory[versionIndex];
              this.restoreVersion(version);
              console.log(`[版本历史] 恢复到版本: ${version.description}`);
            }
          },

          // 清空历史记录
          clearHistory() {
            if (this.versionHistory && this.versionHistory.length > 1) {
              // 保留当前状态作为唯一的历史记录
              const currentVersion = this.versionHistory[this.currentVersionIndex];
              this.versionHistory = [currentVersion];
              this.currentVersionIndex = 0;
              this.updateVersionHistoryUI();
              console.log('[版本历史] 历史记录已清空');
            }
          },

          // === 数据同步和更新 ===
          updateRawValueFromVisual() {
            try {
              const rawTextarea = document.getElementById('new-variable-value');
              if (rawTextarea) {
                rawTextarea.value = JSON.stringify(this.currentVariableValue, null, 2);
                this.previewMvuCommand();
              }
            } catch (error) {
              console.error('从可视化编辑器更新原始值时出错:', error);
            }
          },

          // === 操作方法 ===
          
          // 恢复字段
          revertField(path) {
            if (this.versionHistory.length > 1) {
              const previousVersion = this.versionHistory[this.currentVersionIndex - 1];
              if (previousVersion) {
                const previousValue = this.getValueByPath(previousVersion.data, path);
                this.setValueByPath(this.currentVariableValue, path, previousValue);
                this.updateVisualEditor();
                this.updateRawValueFromVisual();
                console.log(`[字段恢复] ${path}`);
              }
            }
          },

          // 保存字段
          saveField(path) {
            this.createVersionSnapshot(`保存字段: ${path}`);
          },

          // 添加关系
          addRelationship(path) {
            const name = prompt('请输入人物姓名:');
            if (name && name.trim()) {
              const relationships = this.getValueByPath(this.currentVariableValue, path) || {};
              relationships[name.trim()] = {
                relationship: '未知关系',
                favorability: 0
              };
              this.setValueByPath(this.currentVariableValue, path, relationships);
              this.createVersionSnapshot(`添加关系: ${name.trim()}`);
              this.updateVisualEditor();
              this.updateRawValueFromVisual();
            }
          },

          // 删除关系
          removeRelationship(path, name) {
            if (confirm(`确定要删除与 ${name} 的关系吗？`)) {
              const relationships = this.getValueByPath(this.currentVariableValue, path) || {};
              delete relationships[name];
              this.setValueByPath(this.currentVariableValue, path, relationships);
              this.createVersionSnapshot(`删除关系: ${name}`);
              this.updateVisualEditor();
              this.updateRawValueFromVisual();
            }
          },

          // 处理名称变更
          handleNameChange(element, newName) {
            // 这里可以添加名称变更的特殊逻辑
            console.log(`[名称变更] ${newName}`);
          },

          // === 键盘快捷键支持 ===
          initKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
              // 只在可视化编辑模式下启用快捷键
              if (this.currentEditMode !== 'visual') return;
              
              // Ctrl+Z: 撤销
              if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
              }
              
              // Ctrl+Shift+Z 或 Ctrl+Y: 重做
              if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                e.preventDefault();
                this.redo();
              }
              
              // Ctrl+S: 保存当前状态
              if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.createVersionSnapshot('手动保存');
              }
              
              // Esc: 取消当前编辑
              if (e.key === 'Escape') {
                document.activeElement.blur();
              }
            });
          },

          // === 数据收集和解析 ===
          collectVisualEditorData() {
            // 直接返回当前的变量值，因为我们已经实时更新了
            return this.currentVariableValue;
          },

          parseVisualValue(value) {
            if (value === '' || value === 'null') return null;
            if (value === 'true') return true;
            if (value === 'false') return false;
            if (!isNaN(value) && !isNaN(parseFloat(value))) return parseFloat(value);
            return value;
          },

          // === 简单对象和数组渲染器 ===
          renderSimpleObject(obj, path) {
            let html = `<div class="smart-form-group" data-path="${path}">
              <label class="smart-form-label">${path.split('.').pop() || '对象'}</label>`;
            
            Object.entries(obj).forEach(([key, value]) => {
              const fieldPath = `${path}.${key}`;
              html += `<div class="attribute-item">
                <label class="attribute-label">${key}</label>
                <input type="text" class="attribute-input"
                       value="${value}" data-path="${fieldPath}">
              </div>`;
            });
            
            html += `</div>`;
            return html;
          },

          renderSmartArray(arr, path) {
            let html = `<div class="relationships-container" data-path="${path}">
              <div class="details-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>${path.split('.').pop() || '数组'} (${arr.length}项)</span>
                <span>▼</span>
              </div>
              <div class="details-content">
                <ul class="sortable-list" data-path="${path}">`;

            arr.forEach((item, index) => {
              const itemPath = `${path}[${index}]`;
              html += `<li class="sortable-item" data-index="${index}">
                <span class="drag-handle">⋮⋮</span>
                <div style="flex: 1;">`;
              
              if (typeof item === 'object' && item !== null) {
                html += `<textarea class="rich-text-editor" data-path="${itemPath}" rows="2">${JSON.stringify(item, null, 2)}</textarea>`;
              } else {
                html += `<input type="text" class="attribute-input" value="${item}" data-path="${itemPath}">`;
              }
              
              html += `</div>
                <button class="action-btn secondary" onclick="guixuApp.removeArrayItem('${path}', ${index})">删除</button>
              </li>`;
            });

            html += `</ul>
              <div class="action-buttons">
                <button class="action-btn" onclick="guixuApp.addArrayItem('${path}')">添加项目</button>
              </div>
            </div></div>`;

            return html;
          },

          renderPrimitiveValue(value, path) {
            const type = typeof value;
            let inputType = 'text';
            let inputClass = 'attribute-input';
            
            if (type === 'number') {
              inputType = 'number';
            } else if (type === 'boolean') {
              return `<div class="smart-form-group">
                <label class="smart-form-label">${path.split('.').pop() || '值'}</label>
                <select class="smart-select" data-path="${path}">
                  <option value="true" ${value ? 'selected' : ''}>是</option>
                  <option value="false" ${!value ? 'selected' : ''}>否</option>
                </select>
              </div>`;
            }

            return `<div class="smart-form-group">
              <label class="smart-form-label">${path.split('.').pop() || '值'}</label>
              <input type="${inputType}" class="${inputClass}"
                     value="${value}" data-path="${path}">
            </div>`;
          },

          renderGenericObject(obj, path) {
            let html = `<div class="details-section" data-path="${path}">
              <div class="details-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>${path.split('.').pop() || '对象'} (${Object.keys(obj).length}个属性)</span>
                <span>▼</span>
              </div>
              <div class="details-content">`;

            Object.entries(obj).forEach(([key, value]) => {
              const fieldPath = `${path}.${key}`;
              html += this.renderGenericField(key, value, fieldPath);
            });

            html += `</div></div>`;
            return html;
          },

          // === 数组操作方法 ===
          addArrayItem(path) {
            const arr = this.getValueByPath(this.currentVariableValue, path) || [];
            const newItem = prompt('请输入新项目的值:');
            if (newItem !== null) {
              arr.push(newItem);
              this.setValueByPath(this.currentVariableValue, path, arr);
              this.createVersionSnapshot(`添加数组项: ${newItem}`);
              this.updateVisualEditor();
              this.updateRawValueFromVisual();
            }
          },

          removeArrayItem(path, index) {
            const arr = this.getValueByPath(this.currentVariableValue, path) || [];
            if (confirm(`确定要删除第 ${index + 1} 项吗？`)) {
              arr.splice(index, 1);
              this.setValueByPath(this.currentVariableValue, path, arr);
              this.createVersionSnapshot(`删除数组项: 索引${index}`);
              this.updateVisualEditor();
              this.updateRawValueFromVisual();
            }
          },

          // 新增：根据路径设置值
          setValueByPath(obj, path, value) {
            const keys = path.split(/[\.\[\]]/).filter(key => key !== '');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
              const key = keys[i];
              if (!(key in current)) {
                current[key] = isNaN(keys[i + 1]) ? {} : [];
              }
              current = current[key];
            }
            
            const lastKey = keys[keys.length - 1];
            current[lastKey] = value;
          },

          async showRelationships() {
             // --- 最终修复方案：动态注入CSS变量 ---
             document.documentElement.style.setProperty('--relationship-modal-width', '98vw');
             document.documentElement.style.setProperty('--relationship-modal-height', '98vh');
             
              this.loadRelationshipSortSettings(); // 加载排序设置
              this.openModal('relationships-modal');
              const container = document.querySelector('#relationships-modal .relationships-container');
              if (!container) return;

              const listPanel = container.querySelector('.character-list-panel .character-list');
              const detailsPanel = container.querySelector('.character-details-panel');
              if (!listPanel || !detailsPanel) return;

              listPanel.innerHTML = '<p class="modal-placeholder">正在梳理人脉...</p>';
              detailsPanel.innerHTML = '';

              try {
                  const messages = await getChatMessages(getCurrentMessageId());
                  if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
                      listPanel.innerHTML = '<p class="modal-placeholder">无法获取人物关系数据。</p>';
                      return;
                  }
                  const stat_data = messages[0].data.stat_data;
                  this.loadIntimateList();
                  const relationships = this.SafeGetValue(stat_data, '人物关系列表', {});
                  console.log('[归墟-调试] 从MVU获取的完整人物关系列表:', JSON.parse(JSON.stringify(relationships)));
                  
                  this.currentRelationshipData = relationships; // 缓存数据
                  
                  this.renderCharacterList();
                  
                  // 默认显示第一个人物的详情
                  const firstCharacterName = listPanel.querySelector('.character-card')?.dataset.characterName;
                  if (firstCharacterName) {
                      this.renderCharacterDetails(firstCharacterName);
                  } else {
                      detailsPanel.innerHTML = '<p class="modal-placeholder">暂无人物详情。</p>';
                  }
                  
                  this.adjustRelationshipPanelWidth();

                  // 事件绑定现在移动到 renderCharacterDetails 内部，以确保每次渲染都生效

                  // --- 终极尺寸修复：在所有渲染完成后，用JS直接覆盖内联样式 ---
                  const modalContent = container.closest('.modal-content');
                  if (modalContent) {
                    modalContent.style.setProperty('width', '100vw', 'important');
                    modalContent.style.setProperty('height', '100vh', 'important');
                    modalContent.style.setProperty('top', '0', 'important');
                    modalContent.style.setProperty('left', '0', 'important');
                    modalContent.style.setProperty('max-width', 'none', 'important');
                    modalContent.style.setProperty('max-height', 'none', 'important');
                  }

              } catch (error) {
                  console.error('加载人物关系时出错:', error);
                  listPanel.innerHTML = `<p class="modal-placeholder">加载人物关系时出错: ${error.message}</p>`;
              }
          },

          renderCharacterList() {
              const listPanel = document.querySelector('#relationships-modal .character-list');
              const listHeader = document.querySelector('#relationships-modal .character-list-header');
              if (!listPanel || !this.currentRelationshipData || !listHeader) return;

              const relationships = this.currentRelationshipData;
              let allRelationshipEntries = Object.entries(relationships).filter(([name, rel]) => {
                  return name && name !== '$meta' && rel && typeof rel === 'object';
              });

              // 搜索过滤
              const searchTerm = listHeader.querySelector('.character-search-input')?.value || '';
              if (searchTerm) {
                  allRelationshipEntries = allRelationshipEntries.filter(([name, rel]) => {
                      return name.toLowerCase().includes(searchTerm.toLowerCase());
                  });
              }

              // 更新角色计数
              const subtitleElement = document.querySelector('#relationships-modal .character-list-header .subtitle');
              if (subtitleElement) {
                  subtitleElement.textContent = `共 ${allRelationshipEntries.length} 个角色`;
              }

              const sortedEntries = this.sortRelationshipEntries(allRelationshipEntries);

              if (sortedEntries.length === 0) {
                  listPanel.innerHTML = '<p class="modal-placeholder">暂无人物关系。</p>';
                  return;
              }

              listPanel.innerHTML = sortedEntries.map(([name, rel]) => {
                  const cultivation = this.SafeGetValue(rel, '当前修为', '凡人');
                  const tierMatch = cultivation.match(/^(练气|筑基|洞玄|合道|飞升|神桥|凡人)/);
                  const tier = tierMatch ? tierMatch[0] : '凡人';
                  const style = this.getJingJieStyle(tier);
                  const favorability = this.SafeGetValue(rel, '好感度', 0);
                  const favorPercentage = Math.min(Math.abs(favorability) / 200 * 100, 100);
                  const favorClass = favorability >= 0 ? 'positive' : 'negative';

                  // 为卡片背景预留一个style属性
                  return `
                      <div class="character-card" id="card-${name}" data-character-name="${name}" style="">
                          <div class="card-background-overlay"></div>
                          <div class="avatar" id="avatar-${name}">${name.charAt(0)}</div>
                          <div class="info">
                              <div class="name" style="${style}">${name}</div>
                              <div class="favor-bar-container">
                                  <div class="favor-bar-bg">
                                      <div class="favor-bar ${favorClass}" style="width: ${favorPercentage}%;"></div>
                                  </div>
                                  <div class="favor-value">${favorability}</div>
                              </div>
                          </div>
                      </div>
                  `;
              }).join('');

              // --- 异步加载所有列表头像和背景 ---
              sortedEntries.forEach(([name, rel]) => {
                  this.getAvatarFromDB(name).then(avatarRecord => {
                      const avatarEl = document.getElementById(`avatar-${name}`);
                      if (avatarEl && avatarRecord && avatarRecord.avatarImage) {
                          avatarEl.style.backgroundImage = `url(${avatarRecord.avatarImage})`;
                          avatarEl.style.backgroundSize = 'cover';
                          avatarEl.style.backgroundPosition = 'center';
                          avatarEl.textContent = ''; // 清空文字
                      }

                      const cardEl = document.getElementById(`card-${name}`);
                      if (cardEl && avatarRecord && avatarRecord.backgroundImage) {
                          cardEl.style.backgroundImage = `url(${avatarRecord.backgroundImage})`;
                          cardEl.style.backgroundSize = 'cover';
                          cardEl.style.backgroundPosition = 'center';
                      }
                  });
              });
          },

           async renderCharacterDetails(characterName) {
               const detailsPanel = document.querySelector('#relationships-modal .character-details-panel');
               if (!detailsPanel || !this.currentRelationshipData) return;

               const characterData = this.currentRelationshipData[characterName];
               console.log(`[归墟-调试] 正在渲染角色'${characterName}'的详情数据:`, JSON.parse(JSON.stringify(characterData)));
               if (!characterData) {
                   detailsPanel.innerHTML = `<p class="modal-placeholder">无法找到 ${characterName} 的信息。</p>`;
                   return;
               }

               // 1. 异步获取图片和透明度数据
               const avatarRecord = await this.getAvatarFromDB(characterName);
               const avatarImage = avatarRecord ? avatarRecord.avatarImage : '';
               const backgroundImage = avatarRecord ? avatarRecord.backgroundImage : '';
               const backgroundOpacity = avatarRecord ? avatarRecord.backgroundOpacity : 0.5;

               const name = characterName;
               const cultivation = this.SafeGetValue(characterData, '当前修为', '凡人');
               const tierMatch = cultivation.match(/^(练气|筑基|洞玄|合道|飞升|神桥|凡人)/);
               const tier = tierMatch ? tierMatch[0] : '凡人';
               const age = this.SafeGetValue(characterData, '年龄', '??');
               const appearance = this.SafeGetValue(characterData, '外貌', '暂无');
               const personality = this.SafeGetValue(characterData, '性格', '暂无');
               const origin = this.SafeGetValue(characterData, '出身', '暂无');
               const lifespan = this.SafeGetValue(characterData, '寿元', '??');
               const location = this.SafeGetValue(characterData, '所处地点', '未知');

               const style = this.getJingJieStyle(tier);
               
               // 2. 更新HTML模板
               const avatarStyle = avatarImage ? `background-image: url(${avatarImage}); background-size: cover; background-position: center;` : '';
               
               // 新逻辑：通过动态style标签更新伪元素
               this.updateCharacterDetailsBackground(backgroundImage, backgroundOpacity);

               let html = `
                   <div class="details-header">
                       <div class="avatar-container">
                           <div class="large-avatar" id="large-avatar-${name}" style="${avatarStyle}">${avatarImage ? '' : name.charAt(0)}</div>
                           <div class="custom-image-prompt">
                               <i class="fas fa-camera"></i>
                               <span>点击上传图片</span>
                           </div>
                       </div>
                       <div class="main-info">
                           <div class="name" style="${style}">${name}</div>
                           <div style="display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-top: 5px;">
                             <div style="display: flex; align-items: center; gap: 15px;">
                               <div class="title">${cultivation} · ${age}/${lifespan}</div>
                               <div class="location-tag"><i class="fas fa-map-marker-alt"></i> ${location}</div>
                             </div>
                             <div class="avatar-controls">
                                 <i class="fas fa-eye"></i>
                                 <input type="range" id="avatar-opacity-slider" min="0" max="1" step="0.05" value="${backgroundOpacity}" title="调整背景透明度">
                                 <span id="avatar-opacity-value">${Math.round(backgroundOpacity * 100)}%</span>
                             </div>
                           </div>
                       </div>
                   </div>
                   <div class="details-tabs">
                       <button class="tab-button active" data-tab="attributes">详情</button>
                       <button class="tab-button" data-tab="journey">道途</button>
                       <button class="tab-button" data-tab="skills">功法</button>
                       <button class="tab-button" data-tab="equipment">装备</button>
                       <button class="tab-button" data-tab="inventory">储物袋</button>
                       <button class="tab-button" data-tab="social">社交</button>
                       <button class="tab-button" data-tab="memory">记忆</button>
                   </div>
                   <div class="details-content" style="display: flex; flex-direction: column; flex-grow: 1; min-height: 0;">
                       <div class="tab-pane active" id="tab-attributes">
                           <div class="info-section">
                               <h4>基本信息</h4>
                               <div class="info-grid">
                                   <div class="info-item"><strong>好感度:</strong> ${this.SafeGetValue(characterData, '好感度', 0)}</div>
                                   <div class="info-item"><strong>关系:</strong> ${this.SafeGetValue(characterData, '关系', '未知')}</div>
                               </div>
                               <div class="info-grid" style="margin-top: 12px;">
                                   <div class="info-item full-width"><strong>身份背景:</strong> ${this.SafeGetValue(characterData, '身份背景', '暂无')}</div>
                                   <div class="info-item full-width"><strong>性格:</strong> ${personality}</div>
                                   <div class="info-item full-width"><strong>外貌:</strong> ${appearance}</div>
                                   <div class="info-item full-width"><strong>穿着:</strong> ${this.SafeGetValue(characterData, '穿着', '暂无')}</div>
                                   <input type="checkbox" id="toggle-mind" class="hidden-toggle">
                                   <label for="toggle-mind" class="info-item full-width separator-line">—— 内心 ——</label>
                                   <div class="collapsible-content">
                                       <div class="info-item full-width"><strong>当前内心想法:</strong> ${this.SafeGetValue(characterData, '当前内心想法', '暂无')}</div>
                                       <div class="info-item full-width"><strong>短期目标:</strong> ${this.SafeGetValue(characterData, '短期目标', '暂无')}</div>
                                       <div class="info-item full-width"><strong>长期目标:</strong> ${this.SafeGetValue(characterData, '长期目标', '暂无')}</div>
                                   </div>
                               </div>
                           </div>
                           <div class="info-section">
                               <h4>属性总览</h4>
                               <div class="info-grid">
                                    <div class="info-item"><strong>血量:</strong> ${this.SafeGetValue(characterData, '当前血量', 0)} / ${this.SafeGetValue(characterData, '血量', 0)}</div>
                                    <div class="info-item"><strong>法力:</strong> ${this.SafeGetValue(characterData, '当前法力', 0)} / ${this.SafeGetValue(characterData, '法力', 0)}</div>
                               </div>
                               <div class="info-grid" style="margin-top: 12px;">
                                    <div class="info-item"><strong>神海:</strong> ${this.SafeGetValue(characterData, '当前神海', 0)} / ${this.SafeGetValue(characterData, '神海', 0)}</div>
                                    <div class="info-item"><strong>道心:</strong> ${this.SafeGetValue(characterData, '当前道心', 0)} / ${this.SafeGetValue(characterData, '道心', 0)}</div>
                               </div>
                               <div class="info-grid" style="margin-top: 12px;">
                                    <div class="info-item"><strong>空速:</strong> ${this.SafeGetValue(characterData, '当前空速', 0)} / ${this.SafeGetValue(characterData, '空速', 0)}</div>
                                    <div class="info-item"><strong>气运:</strong> ${this.SafeGetValue(characterData, '气运', 0)}</div>
                               </div>
                               <div class="info-grid" style="margin-top: 12px;">
                                    <div class="info-item"><strong>魅力:</strong> ${this.SafeGetValue(characterData, '魅力', 0)}</div>
                                    <div class="info-item"><strong>悟性:</strong> ${this.SafeGetValue(characterData, '悟性', 0)}</div>
                               </div>
                           </div>
                       </div>
                       <div class="tab-pane" id="tab-journey">${this._renderDaotuContent(characterData)}</div>
                       <div class="tab-pane" id="tab-skills">${this._renderGongfaSection(characterData)}</div>
                       <div class="tab-pane" id="tab-equipment">${this._renderEquipmentSection(characterData)}</div>
                       <div class="tab-pane" id="tab-inventory">${this._renderInventorySection(characterData)}</div>
                       <div class="tab-pane" id="tab-social">${this._renderSocialSection(characterData)}</div>
                       <div class="tab-pane" id="tab-memory">${this._renderMemorySection(characterData)}</div>
                   </div>
               `;
               detailsPanel.innerHTML = html;

               // 3. 更新事件绑定
               const avatarContainer = detailsPanel.querySelector('.avatar-container');
               const opacitySlider = detailsPanel.querySelector('#avatar-opacity-slider');
               const opacityValueEl = detailsPanel.querySelector('#avatar-opacity-value');
               let debounceTimer;

               // 绑定头像上传事件
               if (avatarContainer) {
                   avatarContainer.onclick = (e) => {
                       if (e.target.closest('.large-avatar') || e.target.closest('.custom-image-prompt')) {
                           const input = document.createElement('input');
                           input.type = 'file';
                           input.accept = 'image/*';
                           input.onchange = (event) => {
                               const file = event.target.files[0];
                               if (file) this.handleAvatarUpload(characterName, file);
                           };
                           input.click();
                       }
                   };
               }

               // 绑定背景透明度滑块事件
               if (opacitySlider) {
                   let animationFrameId = null;
                   opacitySlider.addEventListener('input', () => {
                       const newOpacity = opacitySlider.value;

                       // 使用requestAnimationFrame优化UI更新
                       if (animationFrameId) {
                           cancelAnimationFrame(animationFrameId);
                       }
                       animationFrameId = requestAnimationFrame(() => {
                           this.updateCharacterDetailsBackground(backgroundImage, newOpacity); // 更新伪元素样式
                           if (opacityValueEl) opacityValueEl.textContent = `${Math.round(newOpacity * 100)}%`;
                       });
                       
                       // 使用防抖优化数据库写入
                       clearTimeout(debounceTimer);
                       debounceTimer = setTimeout(() => {
                           this.storeAvatarInDB({
                               characterName: characterName,
                               backgroundOpacity: parseFloat(newOpacity)
                           });
                       }, 500);
                   });
               }

               // Re-bind tab events
               const tabs = detailsPanel.querySelectorAll('.tab-button');
               const panes = detailsPanel.querySelectorAll('.tab-pane');
               tabs.forEach(tab => {
                   tab.addEventListener('click', () => {
                       tabs.forEach(t => t.classList.remove('active'));
                       tab.classList.add('active');
                       panes.forEach(p => p.classList.remove('active'));
                       const targetPane = detailsPanel.querySelector(`#tab-${tab.dataset.tab}`);
                       if(targetPane) targetPane.classList.add('active');
                   });
               });
           },

          _renderSocialSection(characterData) {
              const socialNetwork = this.SafeGetValue(characterData, '人物关系网', {});
              const entries = Object.entries(socialNetwork).filter(([name]) => name !== '$meta');
              if (entries.length === 0) {
                  return '<p>此人独来独往，尚未建立起自己的人脉。</p>';
              }
              let html = '<div class="social-network-grid">';
              entries.forEach(([name, details]) => {
                  html += `
                      <div class="social-card">
                          <div class="social-card-name">${name}</div>
                          <div class="social-card-relationship">${this.SafeGetValue(details, 'relationship', '未知关系')}</div>
                          <div class="social-card-intimacy">亲密度: ${this.SafeGetValue(details, 'intimacy', '??')}</div>
                          <div class="social-card-description">${this.SafeGetValue(details, 'description', '暂无描述')}</div>
                      </div>
                  `;
              });
              html += '</div>';
              return html;
          },

          _renderMemorySection(characterData) {
              const memory = this.SafeGetValue(characterData, '重要事件记录', {});
              const entries = Object.entries(memory).filter(([name]) => name !== '$meta');
              if (entries.length === 0) {
                  return '<p class="modal-placeholder">往事如烟，此人心中未留下深刻的记忆。</p>';
              }
              
              // 按时间倒序排列 (修复：确保能处理 "第x世-..." 前缀)
              try {
                entries.sort((a, b) => {
                    const dateA = new Date(a[0].substring(a[0].indexOf('-') + 1));
                    const dateB = new Date(b[0].substring(b[0].indexOf('-') + 1));
                    return dateB - dateA;
                });
              } catch (e) {
                console.error("解析记忆事件时间失败:", e);
              }

              let html = '<div class="memory-list-new">';
              entries.forEach(([time, details]) => {
                  const type = this.SafeGetValue(details, 'type', '事件');
                  const description = this.SafeGetValue(details, 'description', '...');
                  html += `
                      <div class="memory-event-new">
                          <div class="event-dot"></div>
                          <div class="event-main-content">
                              <span class="event-time">${time}</span>
                              <span class="event-description">${description}</span>
                          </div>
                          <div class="event-type-tag">${type}</div>
                      </div>
                  `;
              });
              html += '</div>';
              return html;
          },

          _renderDaotuContent(characterData) {
              const daotuOrder = ['真气', '筑基奇物', '洞天', '神妙', '本命神妙', '仙灵之气'];
              let html = '';
              let hasContent = false;

              daotuOrder.forEach(key => {
                  const data = this.SafeGetValue(characterData, key, null);
                  if (data && (typeof data !== 'object' || Object.keys(data).filter(k => k !== '$meta').length > 0)) {
                      hasContent = true;
                      switch (key) {
                          case '真气':
                              html += this._renderZhenqiSection(data);
                              break;
                          case '筑基奇物':
                              html += this._renderZhujiSection(data);
                              break;
                          case '洞天':
                              html += this._renderDongtianSection(data);
                              break;
                          case '本命神妙':
                              html += this._renderBenmingSection(data);
                              break;
                          case '神妙':
                              html += this._renderShenmiaoSection(data);
                              break;
                          case '仙灵之气':
                              html += this._renderXianlingqiSection(data);
                              break;
                      }
                  }
              });

              return hasContent ? html : '<p>道途漫漫，此人尚未留下独特的足迹。</p>';
          },

          _renderZhenqiSection(data) {
              if (!data) return '';
              const title = '真气';
              const name = Object.keys(data).find(k => k !== '$meta');
              if (!name) return '';
              const item = data[name];
              const uniqueId = `toggle-daotu-${title}-${name}`;
              const tier = item.tier || item.品阶 || '凡品';
              const style = this.getItemTierStyle(tier);

              let descriptiveFieldsHtml = '';
              const time = item.获取时间 || item.炼就时间 || item.开辟时间 || item.凝练时间;
              if (time) descriptiveFieldsHtml += `<div class="info-item"><strong>获得于:</strong> ${time}</div>`;
              if (item.经历) descriptiveFieldsHtml += `<div class="info-item full-width"><strong>经历:</strong> ${item.经历}</div>`;

              let attributesHtml = '';
              if (item.attributes_bonus) {
                  attributesHtml += Object.entries(item.attributes_bonus).map(([key, value]) => `<div class="info-item">${key}: +${value}</div>`).join('');
              }
              if (item.百分比加成) {
                  attributesHtml += Object.entries(item.百分比加成).map(([key, value]) => `<div class="info-item">${key}: +${value}%</div>`).join('');
              }

              let termsHtml = '';
              const effects = item.special_effects || item.词条;
              if (effects && typeof effects === 'object') {
                  const termEntries = Object.entries(effects).filter(([key]) => key !== '$meta');
                  if (termEntries.length > 0) {
                      termsHtml += termEntries.map(([key, value]) => `<div class="info-item full-width"><strong>${key}:</strong> ${value.描述 || value}</div>`).join('');
                  }
              }

              const contentHtml = `
                  <div class="info-item full-width daotu-description">${item.description || item.描述 || ''}</div>
                  ${descriptiveFieldsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">来历</h4></div><div class="info-grid">${descriptiveFieldsHtml}</div>` : ''}
                  ${attributesHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">属性加成</h4></div><div class="info-grid">${attributesHtml}</div>` : ''}
                  ${termsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">词条</h4></div><div class="info-grid">${termsHtml}</div>` : ''}
              `;

              return `
                  <div class="info-section">
                      <input type="checkbox" id="${uniqueId}" class="hidden-toggle">
                      <label for="${uniqueId}" class="info-item full-width separator-line">
                          <span>${title}: <span style="${style}">【${tier}】 ${name}</span></span>
                      </label>
                      <div class="collapsible-content"><div>${contentHtml}</div></div>
                  </div>
              `;
          },

          _renderBenmingSection(data) {
              if (!data) return '';
              const title = '本命神妙';
              const name = Object.keys(data).find(k => k !== '$meta');
              if (!name) return '';
              const item = data[name];
              const uniqueId = `toggle-daotu-${title}-${name}`;
              const tier = item.tier || item.品阶 || '凡品';
              const style = this.getItemTierStyle(tier);
              
              let descriptiveFieldsHtml = '';
              const time = item.获取时间 || item.炼就时间 || item.开辟时间 || item.凝练时间;
              if (time) descriptiveFieldsHtml += `<div class="info-item"><strong>获得于:</strong> ${time}</div>`;
              if (item.经历) descriptiveFieldsHtml += `<div class="info-item full-width"><strong>经历:</strong> ${item.经历}</div>`;

              let attributesHtml = '';
              if (item.attributes_bonus) {
                  attributesHtml += Object.entries(item.attributes_bonus).map(([key, value]) => `<div class="info-item">${key}: +${value}</div>`).join('');
              }
              if (item.百分比加成) {
                  attributesHtml += Object.entries(item.百分比加成).map(([key, value]) => `<div class="info-item">${key}: +${value}%</div>`).join('');
              }

              let termsHtml = '';
              if (item.词条 && typeof item.词条 === 'object') {
                  const termEntries = Object.entries(item.词条).filter(([key]) => key !== '$meta');
                  if (termEntries.length > 0) {
                      termsHtml += termEntries.map(([key, value]) => `<div class="info-item full-width"><strong>${key}:</strong> ${value.描述 || value}</div>`).join('');
                  }
              }

              let fusedShenmiaoHtml = '';
              if (item.融合神妙 && typeof item.融合神妙 === 'object') {
                  const fusedEntries = Object.entries(item.融合神妙).filter(([key]) => key !== '$meta');
                  if (fusedEntries.length > 0) {
                      fusedShenmiaoHtml += `<div class="content-divider"><h4 class="daotu-subtitle">融合神妙</h4></div>`;
                      fusedEntries.forEach(([fusedName, fusedData]) => {
                          const fusedTier = fusedData.品阶 || '';
                          const fusedDesc = fusedData.描述 || '暂无描述';
                          fusedShenmiaoHtml += `<div class="info-item full-width"><strong>${fusedName}</strong> ${fusedTier ? `【${fusedTier}】` : ''}: ${fusedDesc}</div>`;
                      });
                  }
              }

              const contentHtml = `
                  <div class="info-item full-width daotu-description">${item.description || item.描述 || ''}</div>
                  ${descriptiveFieldsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">来历</h4></div><div class="info-grid">${descriptiveFieldsHtml}</div>` : ''}
                  ${attributesHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">属性加成</h4></div><div class="info-grid">${attributesHtml}</div>` : ''}
                  ${termsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">词条</h4></div><div class="info-grid">${termsHtml}</div>` : ''}
                  ${fusedShenmiaoHtml}
              `;

              return `
                  <div class="info-section">
                      <input type="checkbox" id="${uniqueId}" class="hidden-toggle">
                      <label for="${uniqueId}" class="info-item full-width separator-line">
                          <span>${title}: <span style="${style}">【${tier}】 ${name}</span></span>
                      </label>
                      <div class="collapsible-content"><div>${contentHtml}</div></div>
                  </div>
              `;
          },

          _renderZhujiSection(data) {
              if (!data) return '';
              const title = '筑基奇物';
              const name = Object.keys(data).find(k => k !== '$meta');
              if (!name) return '';
              const item = data[name];
              const uniqueId = `toggle-daotu-${title}-${name}`;
              const tier = item.tier || item.品阶 || '凡品';
              const style = this.getItemTierStyle(tier);

              let descriptiveFieldsHtml = '';
              const time = item.获取时间 || item.炼就时间 || item.开辟时间 || item.凝练时间;
              if (time) descriptiveFieldsHtml += `<div class="info-item"><strong>获得于:</strong> ${time}</div>`;
              if (item.契合度) descriptiveFieldsHtml += `<div class="info-item"><strong>契合度:</strong> ${item.契合度}</div>`;
              if (item.经历) descriptiveFieldsHtml += `<div class="info-item full-width"><strong>经历:</strong> ${item.经历}</div>`;

              let attributesHtml = '';
              if (item.attributes_bonus) {
                  attributesHtml += Object.entries(item.attributes_bonus).map(([key, value]) => `<div class="info-item">${key}: +${value}</div>`).join('');
              }
              if (item.百分比加成) {
                  attributesHtml += Object.entries(item.百分比加成).map(([key, value]) => `<div class="info-item">${key}: +${value}%</div>`).join('');
              }

              let specialEffectsHtml = '';
              if (item.词条 && Object.keys(item.词条).filter(k => k !== '$meta').length > 0) {
                  specialEffectsHtml = `<div class="content-divider"><h4 class="daotu-subtitle">词条</h4></div>` + Object.entries(item.词条)
                      .filter(([key]) => key !== '$meta')
                      .map(([key, value]) => `<div class="info-item"><strong>${key}:</strong> ${value}</div>`)
                      .join('');
              }

              const contentHtml = `
                  <div class="info-item full-width daotu-description">${item.description || item.描述 || ''}</div>
                  <div class="info-grid">${descriptiveFieldsHtml}</div>
                  <div class="info-grid">${specialEffectsHtml}</div>
                  ${attributesHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">属性加成</h4></div><div class="info-grid">${attributesHtml}</div>` : ''}
              `;

              return `
                  <div class="info-section">
                      <input type="checkbox" id="${uniqueId}" class="hidden-toggle">
                      <label for="${uniqueId}" class="info-item full-width separator-line">
                          <span>${title}: <span style="${style}">【${tier}】 ${name}</span></span>
                      </label>
                      <div class="collapsible-content"><div>${contentHtml}</div></div>
                  </div>
              `;
          },

          _renderDongtianSection(data) {
              if (!data) return '';
              const title = '洞天';
              const name = Object.keys(data).find(k => k !== '$meta');
              if (!name) return '';
              const item = data[name];
              const uniqueId = `toggle-daotu-${title}-${name}`;
              const tier = item.tier || item.品阶 || '凡品';
              const style = this.getItemTierStyle(tier);

              let descriptiveFieldsHtml = '';
              const time = item.获取时间 || item.炼就时间 || item.开辟时间 || item.凝练时间;
              if (time) descriptiveFieldsHtml += `<div class="info-item"><strong>获得于:</strong> ${time}</div>`;
              if (item.经历) descriptiveFieldsHtml += `<div class="info-item full-width"><strong>经历:</strong> ${item.经历}</div>`;

              let attributesHtml = '';
              if (item.attributes_bonus) {
                  attributesHtml += Object.entries(item.attributes_bonus).map(([key, value]) => `<div class="info-item">${key}: +${value}</div>`).join('');
              }
              if (item.百分比加成) {
                  attributesHtml += Object.entries(item.百分比加成).map(([key, value]) => `<div class="info-item">${key}: +${value}%</div>`).join('');
              }

              let daohanHtml = '';
              if (item.道痕 && typeof item.道痕 === 'object') {
                  const daohanEntries = Object.entries(item.道痕).filter(([key]) => key !== '$meta');
                  if (daohanEntries.length > 0) {
                      daohanHtml += `<div class="content-divider" style="margin-top:10px; padding-top:10px;"><h4 class="daotu-subtitle">道痕</h4></div>`;
                      daohanEntries.forEach(([daohanName, daohanData]) => {
                          const daohanTier = daohanData.品阶 || '';
                          const daohanDesc = daohanData.描述 || '暂无描述';
                          daohanHtml += `<div class="info-item full-width"><strong>${daohanName}</strong> ${daohanTier ? `【${daohanTier}】` : ''}: ${daohanDesc}`;
                          
                          // 新增：渲染道痕词条
                          if (daohanData.道痕词条 && typeof daohanData.道痕词条 === 'object') {
                              const termsEntries = Object.entries(daohanData.道痕词条).filter(([key]) => key !== '$meta');
                              if (termsEntries.length > 0) {
                                  daohanHtml += `<div class="daotu-terms">`;
                                  termsEntries.forEach(([termName, termData]) => {
                                      daohanHtml += `<div class="term-item"><strong>${termName}:</strong> ${termData.描述 || termData}</div>`;
                                  });
                                  daohanHtml += `</div>`;
                              }
                          }
                          daohanHtml += `</div>`;
                      });
                  }
              }
              
              const contentHtml = `
                  <div class="info-item full-width daotu-description">${item.description || item.描述 || ''}</div>
                  ${descriptiveFieldsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">来历</h4></div><div class="info-grid">${descriptiveFieldsHtml}</div>` : ''}
                  ${attributesHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">属性加成</h4></div><div class="info-grid">${attributesHtml}</div>` : ''}
                  ${daohanHtml}
              `;

              return `
                  <div class="info-section">
                      <input type="checkbox" id="${uniqueId}" class="hidden-toggle">
                      <label for="${uniqueId}" class="info-item full-width separator-line">
                          <span>${title}: <span style="${style}">【${tier}】 ${name}</span></span>
                      </label>
                      <div class="collapsible-content"><div>${contentHtml}</div></div>
                  </div>
              `;
          },

          _renderShenmiaoSection(data) {
              if (!data || typeof data !== 'object') return '';
              const title = '神妙';
              let html = '';
              const shenmiaoEntries = Object.entries(data).filter(([key]) => key !== '$meta');
              if (shenmiaoEntries.length === 0) return '';
              
              shenmiaoEntries.forEach(([name, item]) => {
                  html += this._renderSingleShenmiao(title, name, item);
              });
              return html;
          },

          _renderSingleShenmiao(title, name, item) {
              const uniqueId = `toggle-daotu-${title}-${name}`;
              const tier = item.tier || item.品阶 || '凡品';
              const style = this.getItemTierStyle(tier);

              let descriptiveFieldsHtml = '';
              const time = item.获取时间 || item.炼就时间 || item.开辟时间 || item.凝练时间;
              if (time) descriptiveFieldsHtml += `<div class="info-item"><strong>获得于:</strong> ${time}</div>`;
              if (item.经历) descriptiveFieldsHtml += `<div class="info-item full-width"><strong>经历:</strong> ${item.经历}</div>`;

              let attributesHtml = '';
              if (item.attributes_bonus) {
                  attributesHtml += Object.entries(item.attributes_bonus).map(([key, value]) => `<div class="info-item">${key}: +${value}</div>`).join('');
              }
              if (item.百分比加成) {
                  attributesHtml += Object.entries(item.百分比加成).map(([key, value]) => `<div class="info-item">${key}: +${value}%</div>`).join('');
              }

              let termsHtml = '';
              if (item.词条 && typeof item.词条 === 'object') {
                  const termEntries = Object.entries(item.词条).filter(([key]) => key !== '$meta');
                  if (termEntries.length > 0) {
                      termsHtml += termEntries.map(([key, value]) => `<div class="info-item full-width"><strong>${key}:</strong> ${value.描述 || value}</div>`).join('');
                  }
              }

              const contentHtml = `
                  <div class="info-item full-width daotu-description">${item.description || item.描述 || ''}</div>
                  ${descriptiveFieldsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">来历</h4></div><div class="info-grid">${descriptiveFieldsHtml}</div>` : ''}
                  ${attributesHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">属性加成</h4></div><div class="info-grid">${attributesHtml}</div>` : ''}
                  ${termsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">词条</h4></div><div class="info-grid">${termsHtml}</div>` : ''}
              `;

              return `
                  <div class="info-section">
                      <input type="checkbox" id="${uniqueId}" class="hidden-toggle">
                      <label for="${uniqueId}" class="info-item full-width separator-line">
                          <span>${title}: <span style="${style}">【${tier}】 ${name}</span></span>
                      </label>
                      <div class="collapsible-content"><div>${contentHtml}</div></div>
                  </div>
              `;
          },

          _renderGongfaSection(characterData) {
              const mainGongfaData = this.SafeGetValue(characterData, '主修功法', null);
              const subGongfaData = this.SafeGetValue(characterData, '辅修功法', null);

              let html = '';
              let hasGongfa = false;

              if (mainGongfaData && typeof mainGongfaData === 'object') {
                  const mainEntries = Object.entries(mainGongfaData).filter(([key]) => key !== '$meta');
                  if (mainEntries.length > 0) {
                      const [name, item] = mainEntries[0];
                      html += this._renderSingleGongfa('主修功法', name, item);
                      hasGongfa = true;
                  }
              }

              if (subGongfaData && typeof subGongfaData === 'object') {
                  const subEntries = Object.entries(subGongfaData).filter(([key]) => key !== '$meta');
                  if (subEntries.length > 0) {
                      const [name, item] = subEntries[0];
                      html += this._renderSingleGongfa('辅修功法', name, item);
                      hasGongfa = true;
                  }
              }

              return hasGongfa ? html : '<p>此人尚未修行任何功法。</p>';
          },

          _renderSingleGongfa(title, name, item) {
              if (!item || typeof item !== 'object' || Object.keys(item).length === 0) return '';
              const uniqueId = `toggle-gongfa-${title}-${name.replace(/\s/g, '-')}`;
              const tier = item.tier || item.品阶 || '凡品';
              const style = this.getItemTierStyle(tier);

              let attributesHtml = '';
              if (item.attributes_bonus) {
                  attributesHtml += Object.entries(item.attributes_bonus).map(([key, value]) => `<div class="info-item">${key}: +${value}</div>`).join('');
              }
              if (item.百分比加成) {
                  attributesHtml += Object.entries(item.百分比加成).map(([key, value]) => `<div class="info-item">${key}: +${value}%</div>`).join('');
              }

              let termsHtml = '';
              const effects = item.special_effects || item.词条;
              if (effects && typeof effects === 'object') {
                  const termEntries = Object.entries(effects).filter(([key]) => key !== '$meta');
                  if (termEntries.length > 0) {
                      termsHtml += termEntries.map(([key, value]) => `<div class="info-item full-width"><strong>${key}:</strong> ${value.描述 || value}</div>`).join('');
                  }
              }

              const contentHtml = `
                  <div class="info-item full-width daotu-description">${item.description || item.描述 || ''}</div>
                  ${attributesHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">属性加成</h4></div><div class="info-grid">${attributesHtml}</div>` : ''}
                  ${termsHtml ? `<div class="content-divider"><h4 class="daotu-subtitle">特殊效果</h4></div><div class="info-grid">${termsHtml}</div>` : ''}
              `;

              return `
                  <div class="info-section">
                      <input type="checkbox" id="${uniqueId}" class="hidden-toggle">
                      <label for="${uniqueId}" class="info-item full-width separator-line">
                          <span>${title}: <span style="${style}">【${tier}】 ${name}</span></span>
                      </label>
                      <div class="collapsible-content"><div>${contentHtml}</div></div>
                  </div>
              `;
          },

          _renderEquipmentSection(characterData) {
              const equipmentKeys = ['武器', '防具', '饰品', '法宝'];
              let html = '';
              let hasEquipment = false;

              equipmentKeys.forEach(key => {
                  const equipmentData = this.SafeGetValue(characterData, key, null);
                  if (equipmentData && typeof equipmentData === 'object') {
                      const entries = Object.entries(equipmentData).filter(([k]) => k !== '$meta');
                      if (entries.length > 0) {
                          const [name, item] = entries[0];
                          html += this._renderSingleGongfa(key, name, item); // 复用功法的渲染逻辑
                          hasEquipment = true;
                      }
                  }
              });

              return hasEquipment ? html : '<p>此人未着寸缕，亦无法宝傍身。</p>';
          },

          _renderInventorySection(characterData) {
              const inventoryData = this.SafeGetValue(characterData, '储物袋', null);
              if (!inventoryData || typeof inventoryData !== 'object') {
                  return '<p class="modal-placeholder" style="text-align:center;">此人身无长物，储物袋空空如也。</p>';
              }

              const itemEntries = Object.entries(inventoryData).filter(([key]) => key !== '$meta');

              if (itemEntries.length === 0) {
                  return '<p class="modal-placeholder" style="text-align:center;">此人身无长物，储物袋空空如也。</p>';
              }

              let html = '<div class="inventory-item-list">';
              const sortedItems = this.sortByTier(itemEntries, ([, item]) => this.SafeGetValue(item, 'tier', '凡品'));
              
              sortedItems.forEach(([name, item]) => {
                  html += this._renderInventoryItem(name, item);
              });
              html += '</div>';

              return html;
          },

          _renderInventoryItem(name, item) {
              if (!item || typeof item !== 'object') return '';

              const tier = this.SafeGetValue(item, 'tier', '凡品');
              const tierStyle = this.getItemTierStyle(tier);
              const quantity = this.SafeGetValue(item, 'quantity', 1);
              const quantityDisplay = quantity > 1 ? `<span class="item-quantity">x${quantity}</span>` : '';
              const description = this.SafeGetValue(item, 'description', this.SafeGetValue(item, 'effect', '无描述'));
              
              const tierDisplay = tier !== '无' ? `<span style="${tierStyle}">品阶: ${tier}</span>` : '';

              let detailsHtml = '';
              const attributes = this.SafeGetValue(item, 'attributes_bonus', null);
              const percentage = this.SafeGetValue(item, '百分比加成', null);
              const effects = item.special_effects || item.词条;

              if (attributes) {
                  detailsHtml += Object.entries(attributes).map(([key, value]) => `<div>${key}: +${value}</div>`).join('');
              }
              if (percentage) {
                  detailsHtml += Object.entries(percentage).map(([key, value]) => `<div>${key}: +${value}</div>`).join('');
              }
              if (effects && typeof effects === 'object') {
                  detailsHtml += Object.entries(effects).filter(([key]) => key !== '$meta').map(([key, value]) => `<div><strong>${key}:</strong> ${value.描述 || value}</div>`).join('');
              }

              return `
                  <div class="inventory-item">
                      <div class="item-header">
                          <div class="item-name" style="${tierStyle}">${name}</div>
                          <div class="item-meta">
                              ${tierDisplay}
                              ${quantityDisplay}
                          </div>
                      </div>
                      <div class="item-description">${description}</div>
                      ${detailsHtml ? `<div class="item-details">${detailsHtml}</div>` : ''}
                  </div>
              `;
          },

          _renderXianlingqiSection(data) {
             if (!data || data <= 0) return '';
             return `<div class="info-section"><h4>仙灵之气</h4><div class="info-grid"><div class="info-item">${data}</div></div></div>`;
          },

           updateCharacterDetailsBackground(imageUrl, opacity) {
               const styleId = 'character-details-bg-style';
               let styleElement = document.getElementById(styleId);
               if (!styleElement) {
                   styleElement = document.createElement('style');
                   styleElement.id = styleId;
                   document.head.appendChild(styleElement);
               }
               
               let styleContent = '';
               if (imageUrl) {
                   styleContent = `
                       .character-details-panel::before {
                           background-image: url(${imageUrl});
                           opacity: ${opacity};
                       }
                   `;
               } else {
                   styleContent = `
                       .character-details-panel::before {
                           background-image: none;
                       }
                   `;
               }
               styleElement.textContent = styleContent;
           },

          bindRelationshipEvents() {
              // 关闭按钮的事件现在由一个在 initEventListeners 中设置的
              // 全局委托监听器处理，此处无需再绑定。

              // 搜索功能事件绑定
              const searchIcon = document.querySelector('#relationships-modal .header-icon[title="搜索"]');
              const searchInput = document.querySelector('#relationships-modal .character-search-input');
              const listHeader = document.querySelector('#relationships-modal .character-list-header');

              if (searchIcon && searchInput && listHeader) {
                  // 防止重复绑定
                  if (!searchIcon.dataset.listenerAttached) {
                      searchIcon.addEventListener('click', () => {
                          listHeader.classList.toggle('is-searching');
                          if (listHeader.classList.contains('is-searching')) {
                              searchInput.focus();
                          }
                      });
                      searchInput.addEventListener('input', () => {
                          this.renderCharacterList();
                      });
                      searchIcon.dataset.listenerAttached = 'true';
                  }
              }

              const listPanel = document.querySelector('#relationships-modal .character-list');
              if(listPanel) {
                  listPanel.addEventListener('click', (e) => {
                      const card = e.target.closest('.character-card');
                      if (card && card.dataset.characterName) {
                          // 移除其他卡片的active状态
                          listPanel.querySelectorAll('.character-card').forEach(c => c.classList.remove('active'));
                          // 给当前卡片添加active状态
                          card.classList.add('active');
                          this.renderCharacterDetails(card.dataset.characterName);
                      }
                  });
              }

              // 排序下拉菜单事件绑定
              const sortDropdown = document.querySelector('#relationships-modal .sort-dropdown');
              if (sortDropdown && !sortDropdown.dataset.listenerAttached) {
                  const sortIcon = sortDropdown.querySelector('.header-icon');
                  const sortMenu = sortDropdown.querySelector('.sort-menu');

                  sortIcon.addEventListener('click', (e) => {
                      e.stopPropagation();
                      sortMenu.classList.toggle('active');
                  });

                  sortMenu.addEventListener('click', (e) => {
                      const option = e.target.closest('.sort-option');
                      if (option && option.dataset.sort) {
                          this.relationshipSortType = option.dataset.sort;
                          this.saveRelationshipSortSettings();
                          this.renderCharacterList();
                          
                          // 更新选中状态
                          sortMenu.querySelectorAll('.sort-option').forEach(opt => opt.classList.remove('selected'));
                          option.classList.add('selected');

                          sortMenu.classList.remove('active');
                      }
                  });

                  // 点击其他地方关闭菜单
                  document.addEventListener('click', (e) => {
                      if (!sortDropdown.contains(e.target)) {
                          sortMenu.classList.remove('active');
                      }
                  });

                  sortDropdown.dataset.listenerAttached = 'true';
              }

              const detailsPanel = document.querySelector('#relationships-modal .character-details-panel');
              if(detailsPanel) {
                  detailsPanel.addEventListener('click', (e) => {
                      const tab = e.target.closest('.tab-button');
                      if (tab && tab.dataset.tab) {
                          detailsPanel.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
                          tab.classList.add('active');

                          detailsPanel.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                          const targetPane = detailsPanel.querySelector(`#tab-${tab.dataset.tab}`);
                          if (targetPane) {
                              targetPane.classList.add('active');
                          }
                      }
                  });
              }
          },

          adjustRelationshipPanelWidth() {
            const container = document.querySelector('#relationships-modal .relationships-container');
            if (!container) return;
        
            const listPanel = container.querySelector('.character-list-panel');
            const detailsPanel = container.querySelector('.character-details-panel');
            if (!listPanel || !detailsPanel) return;
        
            const tabPanes = detailsPanel.querySelectorAll('.tab-pane');
            if (tabPanes.length === 0) return;
        
            let minContentWidth = Infinity;
            let maxContentWidth = 0;
        
            // Temporarily show all panes to calculate their min and max widths
            tabPanes.forEach(pane => {
                const originalDisplay = pane.style.display;
                pane.style.display = 'block'; // Make it visible to measure
                
                const currentWidth = pane.scrollWidth;
                if (currentWidth > 0) {
                    minContentWidth = Math.min(minContentWidth, currentWidth);
                }
                maxContentWidth = Math.max(maxContentWidth, currentWidth);
                
                pane.style.display = originalDisplay; // Restore original display style
            });
        
            // If minContentWidth was not updated (e.g., all panes were empty), default it
            if (minContentWidth === Infinity) {
                minContentWidth = 200; // A reasonable default min-width
            }
        
            const padding = 40; // Account for padding/margins
            const finalDetailsWidth = maxContentWidth + padding;
        
            // Apply the calculated widths
            detailsPanel.style.width = `${finalDetailsWidth}px`;
            detailsPanel.style.flexShrink = '0';
        
            tabPanes.forEach(pane => {
                pane.style.minWidth = `${minContentWidth}px`;
            });
        
            listPanel.style.flexGrow = '1';
          },



          renderRelationships(relationships) {
            // 此函数现在仅作为旧代码的兼容层或调度器，主要逻辑已移至新函数
            // 实际渲染在新showRelationships中完成
            console.warn("renderRelationships is deprecated. Use renderCharacterList and renderCharacterDetails instead.");
            return ""; // 返回空字符串，因为渲染已由新函数处理
          },

renderIntimateRelationships(relationships) {
    // This function is now a proxy to renderRelationships, ensuring UI consistency.
    return this.renderRelationships(relationships);
},

         // --- 新增：亲密关系相关函数 ---
         async showIntimateRelationships() {
           this.openModal('intimate-relationships-modal');
           const body = document.querySelector('#intimate-relationships-modal .modal-body');
           if (!body) return;

           body.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在加载亲密关系...</p>';

           try {
             const messages = await getChatMessages(getCurrentMessageId());
             if (!messages || messages.length === 0 || !messages[0].data || !messages[0].data.stat_data) {
               body.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">无法获取人物关系数据。</p>';
               return;
             }
             const stat_data = messages[0].data.stat_data;
             this.loadIntimateList(); // 渲染前加载亲密列表
             // 变量适配: '人物关系列表' 现在是一个对象
             const relationships = this.SafeGetValue(stat_data, '人物关系列表', {});
             body.innerHTML = this.renderIntimateRelationships(relationships);

             // Add event listener for un-marking
             body.addEventListener('click', e => {
               const button = e.target.closest('.btn-unmark-intimate');
               if (button) {
                   const characterId = button.dataset.characterId;
                   if (characterId) {
                       this.toggleIntimateStatus(characterId, false);
                   }
               }
             });

           } catch (error) {
             console.error('加载亲密关系时出错:', error);
             body.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">加载亲密关系时出错: ${error.message}</p>`;
           }
         },

         saveIntimateList() {
           try {
             localStorage.setItem('guixu_intimate_characters', JSON.stringify(Array.from(this.intimateCharacters)));
           } catch (e) {
             console.error('保存亲密关系列表失败:', e);
           }
         },

         loadIntimateList() {
           try {
             const savedList = localStorage.getItem('guixu_intimate_characters');
             if (savedList) {
               this.intimateCharacters = new Set(JSON.parse(savedList) || []);
             } else {
               this.intimateCharacters = new Set(); // 关键：如果没有保存的列表，确保初始化为空Set
             }
           } catch (e) {
             console.error('加载亲密关系列表失败:', e);
             this.intimateCharacters = new Set(); // 出错时也要确保是Set
           }
         },

         // 新增：加载人物关系设置
         loadRelationshipSettings() {
           try {
             // 加载排序设置
             const savedSort = localStorage.getItem('guixu_relationship_sort');
             this.relationshipSortType = savedSort || 'default';
             
             // 加载显示模式设置
             const savedDisplayMode = localStorage.getItem('guixu_intimate_display_mode');
             this.intimateDisplayMode = savedDisplayMode === 'true';
             
             console.log('加载的排序设置:', this.relationshipSortType);
             console.log('加载的显示模式:', this.intimateDisplayMode);
           } catch (e) {
             console.error('加载人物关系设置失败:', e);
             this.relationshipSortType = 'default';
             this.intimateDisplayMode = false;
           }
         },

         // 新增：设置排序下拉框的值（在渲染后调用）
         setRelationshipSortValue() {
           setTimeout(() => {
             const sortSelect = document.getElementById('relationship-sort');
             if (sortSelect && this.relationshipSortType) {
               sortSelect.value = this.relationshipSortType;
               console.log('设置排序下拉框值为:', this.relationshipSortType);
             }
           }, 100);
         },

        toggleIntimateStatus(characterName, markAsIntimate) {
          const id = String(characterName);
          
          if (markAsIntimate) {
            if (!this.intimateCharacters.has(id)) {
              this.intimateCharacters.add(id);
              this.showTemporaryMessage(`已将 [${id}] 添加到亲密关系`);
            }
          } else {
            if (this.intimateCharacters.has(id)) {
              this.intimateCharacters.delete(id);
              this.showTemporaryMessage(`已将 [${id}] 从亲密关系中移除`);
            }
          }
          this.saveIntimateList();

          // Refresh the currently open modal to reflect the change immediately
          if (document.getElementById('relationships-modal').style.display === 'flex') {
              this.showRelationships();
          }
        },

         saveRelationshipSortSettings() {
             localStorage.setItem('guixu_relationship_sort', this.relationshipSortType);
         },

         loadRelationshipSortSettings() {
             this.relationshipSortType = localStorage.getItem('guixu_relationship_sort') || 'default';
         },

         // 新增：排序关系条目的函数
         sortRelationshipEntries(entries) {
           const sortType = this.relationshipSortType || 'default';
           
           switch (sortType) {
               case 'cultivation-desc':
               case 'cultivation-asc':
                   const tierOrder = {'凡人':0, '练气':1, '筑基':2, '洞玄':3, '合道':4, '神桥':5 };
                   entries.sort(([nameA, relA], [nameB, relB]) => {
                       const tierA = this.SafeGetValue(relA, '当前修为', '凡人').match(/^(练气|筑基|洞玄|合道|神桥|凡人)/)[0];
                       const tierB = this.SafeGetValue(relB, '当前修为', '凡人').match(/^(练气|筑基|洞玄|合道|神桥|凡人)/)[0];
                       const orderA = tierOrder[tierA] || 0;
                       const orderB = tierOrder[tierB] || 0;
                       if (orderA !== orderB) {
                           return sortType === 'cultivation-desc' ? orderB - orderA : orderA - orderB;
                       }
                       return nameA.localeCompare(nameB);
                   });
                   break;
               case 'favor-desc':
               case 'favor-asc':
                   entries.sort(([nameA, relA], [nameB, relB]) => {
                       const favA = parseInt(this.SafeGetValue(relA, '好感度', 0), 10);
                       const favB = parseInt(this.SafeGetValue(relB, '好感度', 0), 10);
                       if (favA !== favB) {
                           return sortType === 'favor-desc' ? favB - favA : favA - favB;
                       }
                       return nameA.localeCompare(nameB);
                   });
                   break;
               case 'default':
               default:
                   entries.sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
                   break;
           }
           return entries;
         },

         // 新增：处理排序变更
         handleRelationshipSort(sortType) {
           this.relationshipSortType = sortType;
           localStorage.setItem('guixu_relationship_sort', sortType);
           this.showRelationships(); // 重新渲染
         },

         // 新增：三连击相关变量和函数
         clickCount: 0,
         clickTimer: null,
         lastClickTarget: null,

         handleTripleClick(characterName, event) {
           // 现在只有点击名字才会触发，可以安全地阻止默认行为
           if (event) {
             event.preventDefault();
             event.stopPropagation();
           }
           
           console.log(`点击角色名字: ${characterName}, 当前计数: ${this.clickCount}, 目标: ${this.lastClickTarget}`);
           
           // 如果点击的是不同的角色，重置计数
           if (this.lastClickTarget !== characterName) {
             this.clickCount = 0;
             this.lastClickTarget = characterName;
           }
           
           this.clickCount++;
           
           // 清除之前的计时器
           if (this.clickTimer) {
             clearTimeout(this.clickTimer);
           }
           
           // 如果达到3次点击，触发亲密关系切换
           if (this.clickCount >= 3) {
             console.log(`三连击成功，切换 ${characterName} 的亲密关系状态`);
             this.toggleIntimateStatus(characterName, !this.intimateCharacters.has(characterName));
             this.clickCount = 0;
             this.lastClickTarget = null;
             
             // 添加视觉反馈
             const card = event ? event.target.closest('.relationship-card') : null;
             if (card) {
               card.classList.add('triple-clicked');
               setTimeout(() => {
                 card.classList.remove('triple-clicked');
               }, 500);
             }
           } else {
             // 设置1秒后重置计数器
             this.clickTimer = setTimeout(() => {
               console.log(`重置点击计数器`);
               this.clickCount = 0;
               this.lastClickTarget = null;
             }, 1000);
           }
         },

         // 新增：切换亲密关系显示模式（带动画效果）
         toggleIntimateMode(targetMode = null) {
           // 如果指定了目标模式，则切换到该模式
           if (targetMode !== null) {
             this.intimateDisplayMode = targetMode === 'intimate';
           } else {
             this.intimateDisplayMode = !this.intimateDisplayMode;
           }
           
           localStorage.setItem('guixu_intimate_display_mode', this.intimateDisplayMode);
           
           // 添加切换动画
           const grid = document.querySelector('.relationships-grid');
           if (grid) {
             grid.classList.add('switching');
             
             setTimeout(() => {
               this.showRelationships(); // 重新渲染
               
               // 渲染完成后移除切换状态并添加进入动画
               setTimeout(() => {
                 const newGrid = document.querySelector('.relationships-grid');
                 if (newGrid) {
                   newGrid.classList.remove('switching');
                 }
               }, 50);
             }, 200);
           } else {
             this.showRelationships(); // 如果没有找到grid，直接重新渲染
           }
         },

         // 新增：处理标签页点击
         handleTabClick(tabType) {
           const targetMode = tabType === 'intimate';
           if (this.intimateDisplayMode !== targetMode) {
             this.toggleIntimateMode(tabType);
           }
         },


          // --- 新增：品阶排序核心函数 ---
          getTierOrder(tier) {
            // 品阶等级映射：数值越高，品阶越高
            // 定义了所有品阶的排序规则，用于 sortByTier 函数。
            const tierOrder = {
              // 练气期
              '凡品': 1,
              '玄品': 2,
              '道品': 3,
              // 筑基期
              '人阶': 4,
              '地阶': 5,
              '天阶': 6,

              // 洞玄境
              '凡尘': 7,
              '灵脉': 8,
              '天象': 9,
              '本源': 10,
              
              // 合道境
              '极品': 11,
              '天品': 12,
              '仙品': 13,

              // 神妙
              '一字神妙': 14,
              '二字神妙': 15,
              '三字神妙': 16,
              '历劫': 17,
              '真一': 18,
              '独仙': 19,

              // 飞升期
              '神品': 20,
              '伪仙器': 21,
              '仙器': 22,

              // 兼容道痕
              '凡尘流韵之痕': 7,
              '灵脉奔涌之痕': 8,
              '天象显化之痕': 9,
              '本源铭刻之痕': 10
            };
            return tierOrder[tier] || 0; // 未知品阶排在最前
          },

          // --- 新增：通用品阶排序函数 ---
          sortByTier(items, getTierFn) {
            if (!Array.isArray(items)) return items;
            
            return [...items].sort((a, b) => {
              const tierA = getTierFn(a);
              const tierB = getTierFn(b);
              const orderA = this.getTierOrder(tierA);
              const orderB = this.getTierOrder(tierB);
              
              // 按 getTierOrder 中定义的品阶顺序从高到低进行稳定排序。
              if (orderA === orderB) {
                return 0;
              }
              return orderB - orderA;
            });
          },

          // --- 体系分离: 境界染色系统 ---
          getJingJieStyle(jingjie) {
              const animatedStyle = 'background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: bold;';
              const baseStyle = 'font-style: italic;';
              const gradientAnimation = 'god-tier-animation 5s linear infinite';
              
              const styles = {
                  '练气': 'color: #B0C4DE;', // LightSteelBlue
                  '筑基': 'color: #66CDAA;', // MediumAquamarine
                  '洞玄': `background: linear-gradient(90deg, #DA70D6, #BA55D3, #9932CC, #BA55D3, #DA70D6); ${animatedStyle} animation: ${gradientAnimation};`, // 原元婴颜色
                  '合道': `background: linear-gradient(90deg, #C71585, #FF1493, #DB7093, #FF1493, #C71585); ${animatedStyle} animation: ${gradientAnimation};`,
                  '飞升': `background: linear-gradient(90deg, #FF416C, #FF4B2B, #FF6B6B, #FF4B2B, #FF416C); ${animatedStyle} animation: ${gradientAnimation};`
              };
              return (styles[jingjie] || 'color: #e0dcd1;') + baseStyle;
          },

          // --- 体系分离: 品阶染色系统 ---
          getItemTierStyle(tier) {
              const animatedStyle = 'background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: bold;';
              const baseStyle = 'font-style: italic;';
              const gradientAnimation = 'god-tier-animation 5s linear infinite';
              const fluorescentAnimation = 'breathing-glow 4s ease-in-out infinite';

              const styles = {
                // 练气期品阶
                '凡品': 'color: #FFFFFF;',
                '玄品': `background: linear-gradient(90deg, #DA70D6, #BA55D3, #9932CC, #BA55D3, #DA70D6); ${animatedStyle} animation: ${gradientAnimation};`,
                '道品': `background: linear-gradient(90deg, #FFD700, #FFFFFF, #FFD700, #FFFFFF, #FFD700); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                // 筑基期品阶
                '人阶': 'color: #66CDAA;',
                '地阶': `background: linear-gradient(90deg, #DA70D6, #BA55D3, #9932CC, #BA55D3, #DA70D6); ${animatedStyle} animation: ${gradientAnimation};`,
                '天阶': `background: linear-gradient(90deg, #FF416C, #FF4B2B, #FF6B6B, #FF4B2B, #FF416C); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                // 洞玄境品阶
                '凡尘': 'color: #66CDAA;',
                '灵脉': `background: linear-gradient(90deg, #DA70D6, #BA55D3, #9932CC, #BA55D3, #DA70D6); ${animatedStyle} animation: ${gradientAnimation};`,
                '天象': `background: linear-gradient(90deg, #DC143C, #FF4500, #B22222, #FF4500, #DC143C); ${animatedStyle} animation: ${gradientAnimation};`,
                '本源': `background: linear-gradient(90deg, #FF416C, #FF4B2B, #FF6B6B, #FF4B2B, #FF416C); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                
                // 洞天道痕兼容
                '凡尘流韵之痕': 'color: #66CDAA;',
                '灵脉奔涌之痕': `background: linear-gradient(90deg, #DA70D6, #BA55D3, #9932CC, #BA55D3, #DA70D6); ${animatedStyle} animation: ${gradientAnimation};`,
                '天象显化之痕': `background: linear-gradient(90deg, #DC143C, #FF4500, #B22222, #FF4500, #DC143C); ${animatedStyle} animation: ${gradientAnimation};`,
                '本源铭刻之痕': `background: linear-gradient(90deg, #FF416C, #FF4B2B, #FF6B6B, #FF4B2B, #FF416C); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,

                // 合道境品阶
                '极品': `background: linear-gradient(90deg, #DC143C, #FF4500, #B22222, #FF4500, #DC143C); ${animatedStyle} animation: ${gradientAnimation};`,
                '天品': `background: linear-gradient(90deg, #C71585, #FF1493, #DB7093, #FF1493, #C71585); ${animatedStyle} animation: ${gradientAnimation};`,
                '仙品': `background: linear-gradient(90deg, #FF416C, #FF4B2B, #FF6B6B, #FF4B2B, #FF416C); ${animatedStyle} animation: ${gradientAnimation};`,
                // 飞升期品阶
                '神品': `background: linear-gradient(90deg, #cccccc, #ffffff, #bbbbbb, #ffffff, #cccccc); ${animatedStyle} animation: ${gradientAnimation};`,
                '伪仙器': `background: linear-gradient(90deg, #cccccc, #FFFACD, #ffffff, #FFFACD, #bbbbbb, #FFFACD, #cccccc); ${animatedStyle} animation: ${gradientAnimation};`,
                '仙器': `background: linear-gradient(90deg, #FFFACD, #206864, #ffffff, #206864, #FFFACD); ${animatedStyle} animation: ${gradientAnimation};`,
                // 神妙/本命神妙品阶
                '一字神妙': `background: linear-gradient(90deg, #C71585, #FF1493, #DB7093, #FF1493, #C71585); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                '二字神妙': `background: linear-gradient(90deg, #DC143C, #FF4500, #B22222, #FF4500, #DC143C); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                '三字神妙': `background: linear-gradient(90deg, #cccccc, #ffffff, #bbbbbb, #ffffff, #cccccc); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                '历劫': `background: linear-gradient(90deg, #6A1B9A, #FFFFFF, #6A1B9A); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                '真一': `background: linear-gradient(90deg, #FFD700, rgba(255, 255, 255, 0.8), #FFD700); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
                '独仙': `background: linear-gradient(135deg, #a8ff78, #78ffd6, #a8ff78); ${animatedStyle} animation: ${gradientAnimation}, ${fluorescentAnimation};`,
              };

              return (styles[tier] || 'color: #e0dcd1;') + baseStyle;
          },
          updateTalentAndLinggen(data) {
            const container = document.getElementById('talent-linggen-list');
            if (!container) return;
            container.innerHTML = '';

            let html = '';

            // 变量适配: 处理对象形式的灵根列表
            const linggenList = this.SafeGetValue(data, '灵根列表', {});
            const linggenEntries = Object.entries(linggenList).filter(([name]) => name !== '$meta');

            if (linggenEntries.length > 0) {
              const sortedLinggen = this.sortByTier(linggenEntries, ([, linggen]) =>
                this.SafeGetValue(linggen, 'tier', '凡品')
              );

              sortedLinggen.forEach(([name, linggen]) => {
                const tier = this.SafeGetValue(linggen, 'tier', '凡品');
                const description = this.SafeGetValue(linggen, 'description', '无描述');
                const tierStyle = this.getItemTierStyle(tier);
                const itemDetailsHtml = this.renderItemDetailsForInventory(linggen);

                html += `
                     <details class="details-container" style="margin-top: 10px;">
                         <summary>
                             <span class="attribute-name">灵根</span>
                             <span class="attribute-value" style="${tierStyle}">【${tier}】 ${name}</span>
                         </summary>
                         <div class="details-content">
                             <p>${description}</p>
                             ${itemDetailsHtml ? `<div class="item-details" style="border-top: 1px solid rgba(201, 170, 113, 0.2); padding-top: 10px; margin-top: 10px;">${itemDetailsHtml}</div>` : ''}
                         </div>
                     </details>
                 `;
              });
            } else {
                 html += `
                   <div class="attribute-item">
                       <span class="attribute-name">灵根</span>
                       <span class="attribute-value">未觉醒</span>
                   </div>
               `;
            }

            // 变量适配: 处理对象形式的天赋列表
            const tianfuList = this.SafeGetValue(data, '天赋列表', {});
            const tianfuEntries = Object.entries(tianfuList).filter(([name]) => name !== '$meta');
            
            if (tianfuEntries.length > 0) {
              const sortedTianfu = this.sortByTier(tianfuEntries, ([, tianfu]) =>
                this.SafeGetValue(tianfu, 'tier', '凡品')
              );

              sortedTianfu.forEach(([name, tianfu]) => {
                const tier = this.SafeGetValue(tianfu, 'tier', '凡品');
                const description = this.SafeGetValue(tianfu, 'description', '无描述');
                const tierStyle = this.getItemTierStyle(tier);
                const itemDetailsHtml = this.renderItemDetailsForInventory(tianfu);

                html += `
                         <details class="details-container" style="margin-top: 10px;">
                             <summary>
                                 <span class="attribute-name">天赋</span>
                                 <span class="attribute-value" style="${tierStyle}">【${tier}】 ${name}</span>
                             </summary>
                             <div class="details-content">
                                 <p>${description}</p>
                                 ${itemDetailsHtml ? `<div class="item-details" style="border-top: 1px solid rgba(201, 170, 113, 0.2); padding-top: 10px; margin-top: 10px;">${itemDetailsHtml}</div>` : ''}
                             </div>
                         </details>
                     `;
              });
            } else {
              html += `
                   <div class="attribute-item">
                       <span class="attribute-name">天赋</span>
                       <span class="attribute-value">未觉醒</span>
                   </div>
               `;
            }

            container.innerHTML = html;
          },

          renderInventory(stat_data) {
            if (!stat_data || Object.keys(stat_data).length === 0) {
              return '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">背包数据为空。</p>';
            }

            const categories = [
              { title: '功法', key: '功法列表', equipable: true },
              { title: '武器', key: '武器列表', equipable: true },
              { title: '防具', key: '防具列表', equipable: true },
              { title: '饰品', key: '饰品列表', equipable: true },
              { title: '法宝', key: '法宝列表', equipable: true },
              { title: '丹药', key: '丹药列表', equipable: false },
              { title: '杂物', key: '其他列表', equipable: false },
            ];

            let html = '';

            categories.forEach(cat => {
              // 变量适配: rawItems 现在是对象
              const rawItems = this.SafeGetValue(stat_data, cat.key, {});
              
              html += `<details class="inventory-category" open>`;
              html += `<summary class="inventory-category-title">${cat.title}</summary>`;

              const itemEntries = Object.entries(rawItems).filter(([name]) => name !== '$meta');

              if (itemEntries.length > 0) {
                html += '<div class="inventory-item-list">';
                
                const sortedItems = this.sortByTier(itemEntries, ([, item]) =>
                  this.SafeGetValue(item, 'tier', '凡品')
                );

                sortedItems.forEach(([name, item]) => {
                  try {
                    const itemWithFixName = { ...item, name };
                    const itemJson = JSON.stringify(itemWithFixName).replace(/'/g, "'");
                    
                    const tier = this.SafeGetValue(item, 'tier', '无');
                    const hasQuantity = item.hasOwnProperty('quantity');
                    const quantity = parseInt(this.SafeGetValue(item, 'quantity', 1), 10);
                    const description = this.SafeGetValue(
                      item,
                      'description',
                      this.SafeGetValue(item, 'effect', '无描述'),
                    );

                    const pendingUses = this.pendingActions
                      .filter(action => action.action === 'use' && action.itemName === name)
                      .reduce((total, action) => total + action.quantity, 0);
                    const pendingDiscards = this.pendingActions
                      .filter(action => action.action === 'discard' && action.itemName === name)
                      .reduce((total, action) => total + action.quantity, 0);
                    const displayQuantity = quantity - pendingUses - pendingDiscards;

                    if (hasQuantity && displayQuantity <= 0) {
                      return;
                    }
                    if (!hasQuantity && pendingDiscards > 0) {
                      return;
                    }

                    const tierStyle = this.getItemTierStyle(tier);
                    const tierDisplay =
                      tier !== '无' ? `<span style="${tierStyle} margin-right: 15px;">品阶: ${tier}</span>` : '';
                    const quantityDisplay = hasQuantity ? `<span class="item-quantity">数量: ${displayQuantity}</span>` : '';

                    const isEquipped = Object.values(this.equippedItems).some(equippedItem => equippedItem && equippedItem.name === name);
                    let actionButton = '';

                    if (cat.title === '功法') {
                      const isEquippedAsMain =
                        this.equippedItems.zhuxiuGongfa && this.equippedItems.zhuxiuGongfa.name === name;
                      const isEquippedAsAux =
                        this.equippedItems.fuxiuXinfa && this.equippedItems.fuxiuXinfa.name === name;

                      if (isEquippedAsMain) {
                        actionButton = `
                                <button class="item-unequip-btn" data-slot-id="equip-zhuxiuGongfa" style="margin-left: 5px;">卸下</button>
                                <button class="item-equip-btn" data-equip-type="fuxiu" style="margin-left: 5px; opacity: 0.5; cursor: not-allowed;" disabled>辅修</button>
                            `;
                      } else if (isEquippedAsAux) {
                        actionButton = `
                                <button class="item-equip-btn" data-equip-type="zhuxiu" style="margin-left: 5px; opacity: 0.5; cursor: not-allowed;" disabled>主修</button>
                                <button class="item-unequip-btn" data-slot-id="equip-fuxiuXinfa" style="margin-left: 5px;">卸下</button>
                            `;
                      } else {
                        actionButton = `
                                <button class="item-equip-btn" data-equip-type="zhuxiu" style="margin-left: 5px;">主修</button>
                                <button class="item-equip-btn" data-equip-type="fuxiu" style="margin-left: 5px;">辅修</button>
                            `;
                      }
                    } else if (cat.equipable) {
                      if (isEquipped) {
                        const slotKey = Object.keys(this.equippedItems).find(
                          key => this.equippedItems[key] && this.equippedItems[key].name === name,
                        );
                        actionButton = `<button class="item-unequip-btn" data-slot-id="equip-${slotKey}">卸下</button>`;
                      } else {
                        actionButton = `<button class="item-equip-btn">装备</button>`;
                      }
                    } else if (cat.title === '丹药' || cat.title === '杂物') {
                      if (displayQuantity <= 0) {
                          actionButton = `<button class="item-use-btn" disabled>已用完</button>`;
                      } else {
                          actionButton = `<button class="item-use-btn">使用</button>`;
                      }
                    }

                    if (cat.title === '丹药' || cat.title === '杂物') {
                      actionButton += `<button class="item-discard-btn" style="margin-left: 5px; background: #8b0000; border-color: #ff6b6b;">丢弃</button>`;
                    } else {
                      actionButton += `<button class="item-discard-btn" style="margin-left: 5px; background: #8b0000; border-color: #ff6b6b;">丢弃</button>`;
                    }

                    let itemDetailsHtml = this.renderItemDetailsForInventory(item);

                    html += `
                                    <div class="inventory-item" data-item-details='${itemJson}' data-category='${cat.title}'>
                                        <div class="item-name" style="${tierStyle}">${name}</div>
                                        <div class="item-header">
                                            <div class="item-meta">
                                                ${tierDisplay}
                                                ${quantityDisplay}
                                            </div>
                                            <div class="item-actions">
                                                ${actionButton}
                                            </div>
                                        </div>
                                        <div class="item-description">${description}</div>
                                        ${itemDetailsHtml ? `<div class="item-details">${itemDetailsHtml}</div>` : ''}
                                    </div>
                                `;
                  } catch (e) {
                    console.error('解析背包物品失败:', item, e);
                    html += `<div class="inventory-item"><p class="item-description">物品数据格式错误</p></div>`;
                  }
                });
                html += '</div>';
              } else {
                html += '<div class="inventory-item-list"><p class="empty-category-text">空空如也</p></div>';
              }
              html += `</details>`;
            });

            return html;
          },

          // --- Tooltip and Equip Logic (重构后) ---
          renderTooltipContent(item) {
            // 根据最新的变量结构解析
            const tierStyle = this.getItemTierStyle(this.SafeGetValue(item, 'tier'));
            const level = this.SafeGetValue(item, 'level', '');
            const tierDisplay = level
              ? `${this.SafeGetValue(item, 'tier', '凡品')} ${level}`
              : this.SafeGetValue(item, 'tier', '凡品');

            let attributesHtml = '';
            const attributes = item.attributes_bonus; // 直接使用新key
            if (typeof attributes === 'object' && attributes !== null && Object.keys(attributes).length > 0) {
              attributesHtml += `<div class="tooltip-section-title">固定加成</div>`;
              for (const [key, value] of Object.entries(attributes)) {
                attributesHtml += `<p><strong>${key}:</strong> ${value > 0 ? '+' : ''}${value}</p>`;
              }
            }

            const percentBonuses = item['百分比加成'];
            if (typeof percentBonuses === 'object' && percentBonuses !== null && Object.keys(percentBonuses).length > 0) {
              attributesHtml += `<div class="tooltip-section-title" style="margin-top: 5px;">百分比加成</div>`;
              for (const [key, value] of Object.entries(percentBonuses)) {
                 attributesHtml += `<p><strong>${key}:</strong> +${value}</p>`;
              }
            }

            let effectsHtml = '';
            const effects = item.special_effects; // 直接使用新key
            if (Array.isArray(effects) && effects.length > 0) {
              effectsHtml += `<div class="tooltip-section-title">特殊词条</div>`;
              effectsHtml += effects.filter(eff => eff !== '$__META_EXTENSIBLE__$').map(eff => `<p>${eff}</p>`).join('');
            }

            return `
                    <div class="tooltip-title" style="${tierStyle}">${this.SafeGetValue(item, 'name')}</div>
                    <p><strong>品阶:</strong> ${tierDisplay}</p>
                    <p><i>${this.SafeGetValue(item, 'description', '无描述')}</i></p>
                    ${
                      attributesHtml
                        ? `<div class="tooltip-section tooltip-attributes">${attributesHtml}</div>`
                        : ''
                    }
                    ${effectsHtml ? `<div class="tooltip-section">${effectsHtml}</div>` : ''}
                `;
          },

          showEquipmentTooltip(element, event) {
            const tooltip = document.getElementById('equipment-tooltip');
            const itemDataString = element.dataset.itemDetails;
            if (!tooltip || !itemDataString) return;

            try {
              const item = JSON.parse(itemDataString.replace(/'/g, "'"));
              tooltip.innerHTML = this.renderTooltipContent(item);
              tooltip.style.display = 'block';

              // **关键修复**: 调整Tooltip位置以防止超出视口
              const tooltipRect = tooltip.getBoundingClientRect();
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;

              let left = event.pageX + 15;
              let top = event.pageY + 15;

              // 如果Tooltip超出右边界，则显示在鼠标左侧
              if (left + tooltipRect.width > viewportWidth) {
                left = event.pageX - tooltipRect.width - 15;
              }

              // 如果Tooltip超出下边界，则显示在鼠标上侧
              if (top + tooltipRect.height > viewportHeight) {
                top = event.pageY - tooltipRect.height - 15;
              }

              tooltip.style.left = `${left}px`;
              tooltip.style.top = `${top}px`;
            } catch (e) {
              console.error('解析装备Tooltip数据失败:', e);
            }
          },

          hideEquipmentTooltip() {
            const tooltip = document.getElementById('equipment-tooltip');
            if (tooltip) tooltip.style.display = 'none';
          },

          renderItemDetailsForInventory(item) {
            let attributesHtml = '';
            const attributes = item.attributes_bonus;
            if (typeof attributes === 'object' && attributes !== null && Object.keys(attributes).length > 0) {
              attributesHtml += '<div class="tooltip-section-title" style="margin-top: 5px;">固定加成</div>';
              for (const [key, value] of Object.entries(attributes)) {
                attributesHtml += `<p><strong>${key}:</strong> ${value > 0 ? '+' : ''}${value}</p>`;
              }
            }

            const percentBonuses = item['百分比加成'];
            if (typeof percentBonuses === 'object' && percentBonuses !== null && Object.keys(percentBonuses).length > 0) {
              attributesHtml += '<div class="tooltip-section-title" style="margin-top: 5px;">百分比加成</div>';
              for (const [key, value] of Object.entries(percentBonuses)) {
                 attributesHtml += `<p><strong>${key}:</strong> +${value}</p>`;
              }
            }

            let effectsHtml = '';
            const effects = item.special_effects;

            if (effects) {
                effectsHtml += `<div class="tooltip-section-title" style="margin-top: 5px;">特殊词条</div>`;
                if (typeof effects === 'object' && !Array.isArray(effects) && effects !== null) {
                    for (const [key, value] of Object.entries(effects)) {
                        if (key === '$meta') continue;
                        effectsHtml += `<p><strong>${key}:</strong> ${value}</p>`;
                    }
                } else if (Array.isArray(effects)) {
                    effectsHtml += effects.filter(eff => eff !== '$__META_EXTENSIBLE__$').map(eff => `<p>${eff}</p>`).join('');
                } else if (typeof effects === 'string' && effects.trim() !== '') {
                    effectsHtml += effects.split('\n').map(e => e.trim()).filter(e => e).map(eff => `<p>${eff}</p>`).join('');
                }
            }

            return `${attributesHtml}${effectsHtml}`;
          },

          equipItem(item, category, buttonElement, equipType = null) {
            const itemName = this.SafeGetValue(item, 'name');
            if (!itemName || itemName === 'N/A') {
              this.showTemporaryMessage('物品无名称，无法装备。');
              return;
            }
            
            // Bug修复：检查功法是否已被装备在另一个槽位
            if (category === '功法') {
              const isEquippedAsMain = this.equippedItems.zhuxiuGongfa && this.equippedItems.zhuxiuGongfa.name === itemName;
              const isEquippedAsAux = this.equippedItems.fuxiuXinfa && this.equippedItems.fuxiuXinfa.name === itemName;

              if (
                (equipType === 'fuxiuXinfa' && isEquippedAsMain) ||
                (equipType === 'zhuxiuGongfa' && isEquippedAsAux)
              ) {
                this.showTemporaryMessage('该功法已被装备在另一槽位。');
                return;
              }
            }

            const categoryMap = { 武器: 'wuqi', 防具: 'fangju', 饰品: 'shipin', 法宝: 'fabao1', 功法: equipType };
            const slotKey = categoryMap[category];

            if (!slotKey) {
              this.showTemporaryMessage('错误的装备分类或类型。');
              return;
            }
            
            // **关键修复**: 检查物品是否已装备在其他槽位，如果是，则先卸载
            const currentlyEquippedSlot = Object.keys(this.equippedItems).find(
              key => this.equippedItems[key] && this.equippedItems[key].name === itemName,
            );
            if (currentlyEquippedSlot && currentlyEquippedSlot !== slotKey) {
              const oldSlotElement = document.getElementById(`equip-${currentlyEquippedSlot}`);
              if (oldSlotElement) {
                this.unequipItem(`equip-${currentlyEquippedSlot}`, oldSlotElement, false); // 静默卸载
              }
            }

            const slotElement = document.getElementById(`equip-${slotKey}`);
            if (!slotElement) return;

            // 如果该槽位已有装备，先执行卸载操作
            const oldItem = this.equippedItems[slotKey];
            if (oldItem) {
              this.unequipItem(`equip-${slotKey}`, slotElement, false);
            }

            // 更新前端状态和UI（乐观更新）
            this.equippedItems[slotKey] = item; // **逻辑修正**: 存储完整对象
            const tier = this.SafeGetValue(item, 'tier', '凡品');
            const tierStyle = this.getItemTierStyle(tier);
            slotElement.textContent = this.SafeGetValue(item, 'name');
            slotElement.setAttribute('style', tierStyle);
            slotElement.classList.add('equipped');
            slotElement.dataset.itemDetails = JSON.stringify(item).replace(/'/g, "'");

            // 更新背包UI，使其能反映最新状态
            if (buttonElement.closest('#inventory-modal')) {
              this.showInventory();
            }

            // 添加到指令队列（优化：先移除旧指令，再添加新指令）
            const defaultTextMap = {
              wuqi: '武器',
              fangju: '防具',
              shipin: '饰品',
              fabao1: '法宝',
              zhuxiuGongfa: '主修功法',
              fuxiuXinfa: '辅修心法',
            };
            const slotFriendlyName = defaultTextMap[slotKey] || category;
            this.pendingActions = this.pendingActions.filter(action => action.itemName !== itemName);
            this.pendingActions.push({
              action: 'equip',
              itemName: itemName,
              category: slotFriendlyName,
            });

            this.showTemporaryMessage(`已装备 ${this.SafeGetValue(item, 'name')}`);
            this.updateDisplayedAttributes();
            this.saveEquipmentState(); // 保存状态
            this.savePendingActions(); // 保存指令状态
          },

          unequipItem(slotId, slotElement, showMessage = true, refreshInventoryUI = true) {
            const slotKey = slotId.replace('equip-', '');
            const defaultTextMap = {
              wuqi: '武器',
              fangju: '防具',
              shipin: '饰品',
              fabao1: '法宝',
              zhuxiuGongfa: '主修功法',
              fuxiuXinfa: '辅修心法',
            };

            const itemDataString = slotElement.dataset.itemDetails;
            if (!itemDataString) return; // 如果没有物品，则不执行任何操作

            let itemName = '一件装备';
            try {
              const item = JSON.parse(itemDataString.replace(/'/g, "'"));
              itemName = this.SafeGetValue(item, 'name');
            } catch (e) {
              console.error('卸载时解析物品数据失败', e);
            }

            // 清理前端状态和UI
            this.equippedItems[slotKey] = null;
            slotElement.textContent = defaultTextMap[slotKey] || '空';
            slotElement.classList.remove('equipped');
            slotElement.removeAttribute('style');
            delete slotElement.dataset.itemDetails;

            // **关键修复**: 不再进行复杂的局部DOM更新，而是直接重新渲染整个背包以确保UI同步
            if (refreshInventoryUI) {
              this.showInventory();
            }

            // 添加到指令队列（优化：先移除旧指令，再添加新指令）
            this.pendingActions = this.pendingActions.filter(action => action.itemName !== itemName);
            this.pendingActions.push({
              action: 'unequip',
              itemName: itemName,
              category: defaultTextMap[slotKey],
            });

            if (showMessage) {
              this.showTemporaryMessage(`已卸下 ${itemName}`);
            }
            this.updateDisplayedAttributes();
            this.saveEquipmentState(); // 保存状态
            this.savePendingActions(); // 保存指令状态
            // 注意：showInventory() 已经包含了关闭模态框再打开的过程，所以UI会刷新
          },

          loadEquipmentFromMVU(data) {
            const equipmentMap = {
              武器: 'wuqi',
              主修功法: 'zhuxiuGongfa',
              辅修心法: 'fuxiuXinfa',
              防具: 'fangju',
              饰品: 'shipin',
              法宝栏1: 'fabao1',
            };
            const defaultTextMap = {
              wuqi: '武器',
              fangju: '防具',
              shipin: '饰品',
              fabao1: '法宝',
              zhuxiuGongfa: '主修功法',
              fuxiuXinfa: '辅修心法',
            };

            for (const [mvuKey, slotKey] of Object.entries(equipmentMap)) {
              const slot = document.getElementById(`equip-${slotKey}`);
              if (!slot) continue;

              // mvu中的装备数据通常是 [ { item_object } ] 的形式
              // **局部修复**: 直接使用 _.get 获取装备数组，避免 SafeGetValue 将其错误地转为字符串
              const itemArray = _.get(data, mvuKey, null);
              const item = Array.isArray(itemArray) && itemArray.length > 0 ? itemArray[0] : null;

              if (item && typeof item === 'object') {
                const tier = this.SafeGetValue(item, 'tier', '凡品');
                const tierStyle = this.getItemTierStyle(tier);
                // **逻辑修正**: 此处不再主动修改 this.equippedItems
                // this.equippedItems 的状态由 localStorage 和 equip/unequip 动作管理
                // this.equippedItems[slotKey] = item;
                slot.textContent = this.SafeGetValue(item, 'name');
                slot.setAttribute('style', tierStyle);
                slot.classList.add('equipped');
                slot.dataset.itemDetails = JSON.stringify(item).replace(/'/g, "'");
              } else {
                // this.equippedItems[slotKey] = null; // **关键修复**: 此函数不应修改核心状态，只渲染从mvu得到的数据
                slot.textContent = defaultTextMap[slotKey];
                slot.classList.remove('equipped');
                slot.removeAttribute('style');
                delete slot.dataset.itemDetails;
              }
            }
          },

          updateDisplayedAttributes() {
            // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
            // V2 Refactor: Optimistic update based on MVU max values + equipment bonuses only.
            if (!this.currentMvuState || !this.currentMvuState.stat_data) {
              console.warn('无法更新属性：mvu状态不可用，使用默认显示。');
              // 当数据不可用时，显示默认的"..."而不是"0 / 0"
              document.getElementById('attr-xueliang').innerText = '...';
              document.getElementById('attr-fali').innerText = '...';
              document.getElementById('attr-shenhai').innerText = '...';
              document.getElementById('attr-daoxin').innerText = '...';
              document.getElementById('attr-kongsu').innerText = '...';
              document.getElementById('attr-qiyun').innerText = '...';
              document.getElementById('attr-wuxing').innerText = '...';
              document.getElementById('attr-meili').innerText = '...';
              return;
            }

            const stat_data = this.currentMvuState.stat_data;
            
            // 1. 基础显示：直接使用mvu变量中的上限属性作为基础值
            // 修复：使用更合理的默认值，避免显示0/0
            const mvuMaxAttrs = {
              fali: parseInt(this.SafeGetValue(stat_data, '法力', 100), 10) || 100,
              shenhai: parseInt(this.SafeGetValue(stat_data, '神海', 50), 10) || 50,
              daoxin: parseInt(this.SafeGetValue(stat_data, '道心', 10), 10) || 10,
              kongsu: parseInt(this.SafeGetValue(stat_data, '空速', 5), 10) || 5,
              qiyun: parseInt(this.SafeGetValue(stat_data, '气运', 10), 10) || 10,
              wuxing: parseInt(this.SafeGetValue(stat_data, '悟性', 10), 10) || 10,
              meili: parseInt(this.SafeGetValue(stat_data, '魅力', 10), 10) || 10,
            };

            // 2. 前端乐观更新：只计算新装备的武器等物品的加成
            const equipmentFlatBonuses = { fali: 0, shenhai: 0, daoxin: 0, kongsu: 0, qiyun: 0, wuxing: 0, meili: 0 };
            const equipmentPercentBonuses = { fali: 0, shenhai: 0, daoxin: 0, kongsu: 0, qiyun: 0, wuxing: 0, meili: 0 };
            const attributeMapping = { 法力: 'fali', 神海: 'shenhai', 道心: 'daoxin', 空速: 'kongsu', 气运: 'qiyun', 悟性: 'wuxing', 魅力: 'meili' };

            const processEquipmentBonuses = (item) => {
              if (!item || typeof item !== 'object') return;
              
              const flatBonuses = item.attributes_bonus;
              if (flatBonuses && typeof flatBonuses === 'object') {
                for (const [attrName, bonusValue] of Object.entries(flatBonuses)) {
                  const attrKey = attributeMapping[attrName];
                  if (attrKey) {
                    equipmentFlatBonuses[attrKey] += parseInt(bonusValue, 10) || 0;
                  }
                }
              }
              
              const percentBonuses = item['百分比加成'];
              if (percentBonuses && typeof percentBonuses === 'object') {
                 for (const [attrName, bonusValue] of Object.entries(percentBonuses)) {
                    const attrKey = attributeMapping[attrName];
                    if (attrKey) {
                        equipmentPercentBonuses[attrKey] += parseFloat(String(bonusValue).replace('%','')) / 100 || 0;
                    }
                }
              }
            };

            // 只遍历 this.equippedItems
            Object.values(this.equippedItems).forEach(processEquipmentBonuses);

            // 计算最终乐观更新后的上限
            const finalMaxAttrs = {
              fali: Math.floor((mvuMaxAttrs.fali + equipmentFlatBonuses.fali) * (1 + equipmentPercentBonuses.fali)),
              shenhai: Math.floor((mvuMaxAttrs.shenhai + equipmentFlatBonuses.shenhai) * (1 + equipmentPercentBonuses.shenhai)),
              daoxin: Math.floor((mvuMaxAttrs.daoxin + equipmentFlatBonuses.daoxin) * (1 + equipmentPercentBonuses.daoxin)),
              kongsu: Math.floor((mvuMaxAttrs.kongsu + equipmentFlatBonuses.kongsu) * (1 + equipmentPercentBonuses.kongsu)),
              qiyun: Math.floor((mvuMaxAttrs.qiyun + equipmentFlatBonuses.qiyun) * (1 + equipmentPercentBonuses.qiyun)),
              wuxing: Math.floor((mvuMaxAttrs.wuxing + equipmentFlatBonuses.wuxing) * (1 + equipmentPercentBonuses.wuxing)),
              meili: Math.floor((mvuMaxAttrs.meili + equipmentFlatBonuses.meili) * (1 + equipmentPercentBonuses.meili)),
            };
             // 血量上限根据最终四维计算
            finalMaxAttrs.xueliang = Math.floor((finalMaxAttrs.fali * 0.2) + (finalMaxAttrs.daoxin * 0.5) + (finalMaxAttrs.shenhai * 0.3) + (finalMaxAttrs.kongsu * 0.1));

            this.calculatedMaxAttributes = finalMaxAttrs; // 缓存计算结果

            // 3. 去除当前值不能超出上限的bug，直接读取变量数据
            // 修复：使用与上限属性对应的默认值，确保当前值不会显示为0
            const currentAttrs = {
                fali: parseInt(this.SafeGetValue(stat_data, '当前法力', mvuMaxAttrs.fali), 10) || mvuMaxAttrs.fali,
                shenhai: parseInt(this.SafeGetValue(stat_data, '当前神海', mvuMaxAttrs.shenhai), 10) || mvuMaxAttrs.shenhai,
                daoxin: parseInt(this.SafeGetValue(stat_data, '当前道心', mvuMaxAttrs.daoxin), 10) || mvuMaxAttrs.daoxin,
                kongsu: parseInt(this.SafeGetValue(stat_data, '当前空速', mvuMaxAttrs.kongsu), 10) || mvuMaxAttrs.kongsu,
                xueliang: parseInt(this.SafeGetValue(stat_data, '当前血量', finalMaxAttrs.xueliang), 10) || finalMaxAttrs.xueliang,
            };

            // 4. 更新UI - 直接显示数值，允许负值和任何数值
            const updateAttr = (elementId, current, max) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerText = `${current} / ${max}`;
                }
            };
             const updateSingleAttr = (elementId, value) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerText = value;
                }
            };

            updateAttr('attr-xueliang', currentAttrs.xueliang, finalMaxAttrs.xueliang);
            updateAttr('attr-fali', currentAttrs.fali, finalMaxAttrs.fali);
            updateAttr('attr-shenhai', currentAttrs.shenhai, finalMaxAttrs.shenhai);
            updateAttr('attr-daoxin', currentAttrs.daoxin, finalMaxAttrs.daoxin);
            updateAttr('attr-kongsu', currentAttrs.kongsu, finalMaxAttrs.kongsu);
            
            // 气运、悟性、魅力只显示最大值
            updateSingleAttr('attr-qiyun', finalMaxAttrs.qiyun);
            updateSingleAttr('attr-wuxing', finalMaxAttrs.wuxing);
            updateSingleAttr('attr-meili', finalMaxAttrs.meili);
            
            // 年龄相关属性已从主界面移除，仅在归墟系统中显示
            
            // 修为进度相关属性更新
            const xiuxingjindu = this.SafeGetValue(stat_data, '修为进度', '0');
            const xiuxingpingjing = this.SafeGetValue(stat_data, '修为瓶颈', '无');
            const jingjieYingshe = this.SafeGetValue(stat_data, '境界映射', '1');
            document.getElementById('attr-xiuxing-jindu').innerText = `${xiuxingjindu}%`;
            document.getElementById('attr-xiuxing-pingjing').innerText = xiuxingpingjing;
            document.getElementById('attr-jingjie-yingshe').innerText = jingjieYingshe;
            
            // 更新修为进度条
            const progressBar = document.getElementById('progress-xiuxing');
            if (progressBar) {
              progressBar.style.width = `${xiuxingjindu}%`;
            }

            this.updateSpecialAttributes(stat_data);
          },

          updateSpecialAttributes(stat_data) {
            // 修改：目标容器变为修为详情列表
            const container = document.getElementById('xiuwei-details-list');
            // 清空旧的特殊属性内容，保留原有的境界、进度等
            const oldSpecialAttrs = container.querySelectorAll('.details-container');
            oldSpecialAttrs.forEach(el => el.remove());

            const specialAttrs = {
              '真气': 'zhenqi',
              '筑基奇物': 'zhujiqiwu',
              '洞天': 'dongtian',
              '神妙': 'shenmiao',
              '本命神妙': 'benmingshenmiao'
            };

            // 处理仙灵之气
            const xianlingzhiqi = this.SafeGetValue(stat_data, '仙灵之气', null);
            // 确保在处理其他属性 *之后* 再处理仙灵之气，以保证其在最下方
            const finalHtmlProcessing = () => {
              const existingEl = document.getElementById('xianlingzhiqi-dynamic-item');
              if(existingEl) existingEl.remove();

              if (xianlingzhiqi !== null && xianlingzhiqi > 0) {
                const detailsContainer = document.getElementById('xiuwei-details-list');
                if(detailsContainer){
                  const xianlingzhiqiHtml = `
                    <div class="attribute-item" id="xianlingzhiqi-dynamic-item">
                      <span class="attribute-name xianlingzhiqi-special">仙灵之气</span>
                      <span id="attr-xianlingzhiqi" class="attribute-value xianlingzhiqi-special">${xianlingzhiqi}</span>
                    </div>
                  `;
                  detailsContainer.insertAdjacentHTML('beforeend', xianlingzhiqiHtml);
                }
              }
            };

            let finalHtml = '';
            for (const [name, idPrefix] of Object.entries(specialAttrs)) {
                const data = this.SafeGetValue(stat_data, name, null);
                if (!data || typeof data !== 'object') continue;

                const entries = Object.entries(data).filter(([key]) => key !== '$meta');
                if (entries.length === 0) continue;

                let sectionHtml = '';
                // 统一处理所有特殊属性
                let itemsHtml = '';
                entries.forEach(([itemName, itemDetails]) => {
                        const tier = this.SafeGetValue(itemDetails, '品阶', '凡品');
                        const tierStyle = this.getItemTierStyle(tier);
                        const itemDetailsHtml = this.renderRecursiveDetails(itemDetails, ['品阶']);
                        itemsHtml += `
                           <details class="details-container">
                               <summary>
                                   <span class="attribute-name">${name}</span>
                                   <span class="attribute-value" style="${tierStyle}">${tier ? `【${tier}】 ` : ''}${itemName}</span>
                               </summary>
                               <div class="details-content">${itemDetailsHtml}</div>
                           </details>
                        `;
                    });
                    // 修改：不再创建独立的section，直接使用itemsHtml
                    if (itemsHtml) {
                        sectionHtml = itemsHtml;
                    }
                 if(sectionHtml) {
                    finalHtml += sectionHtml;
                }
            }
            // 修改：使用appendChild追加内容，而不是innerHTML覆盖
            container.insertAdjacentHTML('beforeend', finalHtml);
            
            // 最后处理仙灵之气
            finalHtmlProcessing();
          },

          renderRecursiveDetails(obj, excludeKeys = []) {
            if (!obj || typeof obj !== 'object') return '';

            let mainContentHtml = '';
            let descriptionHtml = '';
            let citiaoHtml = '';
            let bonusHtml = '';
            let percentBonusHtml = '';
            let nestedCollectionHtml = '';
            let historyHtml = '';

            const tempObj = { ...obj };

            // 提取并分离各类数据
            const description = tempObj['描述'] || '';
            if(description) delete tempObj['描述'];

            const citiaoData = tempObj['词条'] || null;
            if(citiaoData) {
                citiaoHtml = this.renderCitiaoBlock(citiaoData);
                delete tempObj['词条'];
            }
            
            const bonusData = tempObj['attributes_bonus'] || null;
            if(bonusData) {
                bonusHtml = this.renderBonusBlock('固定加成', bonusData);
                delete tempObj['attributes_bonus'];
            }

            const percentBonusData = tempObj['百分比加成'] || null;
            if(percentBonusData) {
                percentBonusHtml = this.renderBonusBlock('百分比加成', percentBonusData, true);
                delete tempObj['百分比加成'];
            }
            
            const timeKeys = ['获取时间', '开辟时间', '凝练时间', '炼就时间'];
            let timeStr = '';
            timeKeys.forEach(key => {
                if (tempObj[key]) {
                    timeStr = tempObj[key];
                    delete tempObj[key];
                }
            });
            let historyStr = tempObj['经历'] || '';
            if(historyStr) delete tempObj['经历'];

            if (timeStr || historyStr) {
                 let combinedGossip = '';
                if (timeStr) combinedGossip += timeStr;
                if (historyStr) combinedGossip += (timeStr ? '，' : '') + historyStr;
                historyHtml = `
                    <details class="details-container">
                        <summary>
                            <span class="attribute-name">获取经历</span>
                            <span class="attribute-value"></span>
                        </summary>
                        <div class="details-content"><p>${combinedGossip}</p></div>
                    </details>
                `;
            }

            // 渲染剩余的嵌套集合
            for (const [key, value] of Object.entries(tempObj)) {
                 if (key !== '$meta' && typeof value === 'object' && value !== null) {
                    nestedCollectionHtml += this.renderNestedCollection(key, value);
                 }
            }

            // 组装最终HTML
            if(description) mainContentHtml += `<p>${description}</p>`;
            if(citiaoHtml) mainContentHtml += `<div class="item-details">${citiaoHtml}</div>`;
            if(nestedCollectionHtml) mainContentHtml += nestedCollectionHtml;
            if(bonusHtml) mainContentHtml += bonusHtml;
            if(percentBonusHtml) mainContentHtml += percentBonusHtml;
            if(historyHtml) mainContentHtml += historyHtml;

            return mainContentHtml;
          },

          renderCitiaoBlock(citiaoObj) {
            if (!citiaoObj || typeof citiaoObj !== 'object') return '';
            let html = '<p><strong>词条</strong></p>';
            for (const [name, description] of Object.entries(citiaoObj)) {
              if (name === '$meta') continue;
              html += `<p><span class="attribute-value">${name}</span>: ${description}</p>`;
            }
            return html;
          },

          renderBonusBlock(title, bonusObj, isPercentage = false) {
            if (!bonusObj || typeof bonusObj !== 'object') return '';
            let html = `<p><strong>${title}</strong></p>`;
            for (const [attr, value] of Object.entries(bonusObj)) {
              if (attr === '$meta') continue;
              const displayValue = isPercentage ? `${value}` : `+${value}`;
              html += `<p><strong style="color: white;">${attr}</strong>: ${displayValue}</p>`;
            }
            return html;
          },

          renderNestedCollection(collectionName, collectionObj) {
            if (!collectionObj || typeof collectionObj !== 'object') return '';
            let html = `<p><strong>${collectionName}</strong></p>`;
            for (const [itemName, itemData] of Object.entries(collectionObj)) {
              if (itemName === '$meta') continue;
              
              const tier = itemData.品阶 || '';
              const tierStyle = tier ? this.getItemTierStyle(tier) : '';
              const quantity = itemData.数量 ? ` x${itemData.数量}` : '';
              const subDetails = this.renderRecursiveDetails(itemData, ['品阶', '数量']);
              
              html += `
                <details class="details-container">
                  <summary>
                    <span class="attribute-name">${itemName}${quantity}</span>
                    <span class="attribute-value" ${tierStyle ? `style="${tierStyle}"` : ''}>${tier ? `【${tier}】` : ''}</span>
                  </summary>
                  <div class="details-content">
                    ${subDetails}
                  </div>
                </details>
              `;
            }
            return html;
          },

          // 临时消息提示 (v2 - 支持类型和颜色)
          showTemporaryMessage(message, type = 'info', duration = 3000) {
              const existingMsg = document.querySelector('.temp-message-popup');
              if (existingMsg) existingMsg.remove();

              const colors = {
                  info: { bg: 'rgba(45, 27, 61, 0.9)', text: '#c9aa71' },
                  success: { bg: 'rgba(40, 167, 69, 0.9)', text: '#ffffff' },
                  warning: { bg: 'rgba(255, 193, 7, 0.9)', text: '#000000' },
                  error: { bg: 'rgba(220, 53, 69, 0.9)', text: '#ffffff' }
              };
              const selectedColor = colors[type] || colors.info;

              const msgElement = document.createElement('div');
              msgElement.className = 'temp-message-popup';
              msgElement.textContent = message;
              msgElement.style.cssText = `
                      position: absolute;
                      top: 20px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: ${selectedColor.bg};
                      color: ${selectedColor.text};
                      padding: 10px 20px;
                      border-radius: 5px;
                      z-index: 2000;
                      font-size: 14px;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                      text-align: center;
                      transition: opacity 0.5s ease-out;
                      max-width: 90%;
                  `;
              document.querySelector('.guixu-root-container').appendChild(msgElement);

              setTimeout(() => {
                  msgElement.style.opacity = '0';
                  setTimeout(() => msgElement.remove(), 500);
              }, duration - 500);
          },

          showCommandCenter() {
              this.openModal('command-center-modal');
              const body = document.querySelector('#command-center-modal .modal-body');
              if (!body) return;
              
              if (this.pendingActions.length === 0) {
                  body.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">暂无待执行的指令。</p>';
                  return;
              }
              
              let html = '<ul class="command-center-actions">';
              this.pendingActions.forEach(cmd => {
                  // 核心修复：调用我们统一的格式化函数
                  const actionText = this._formatActionText(cmd);
                  if (actionText) {
                      html += `<li class="command-center-action-item">${actionText}</li>`;
                  }
              });
              html += '</ul>';
              body.innerHTML = html;
          },

          clearPendingActions() {
              // 核心修复：移除所有状态回滚逻辑，现在只需清空指令队列
              this.pendingActions = [];
              this.savePendingActions();
              this.showTemporaryMessage('指令已清空');

              // 刷新所有可能打开的相关界面
              if (document.getElementById('command-center-modal').style.display === 'flex') {
                  this.showCommandCenter();
              }
              if (document.getElementById('gacha-settings-popup').style.display === 'flex') {
                  this._renderGachaSettingsTab('command_center');
              }
              if (document.getElementById('gacha-gallery-popup').style.display === 'flex') {
                  this.showGachaGalleryPopup();
              }
          },

          refreshLocalStorage() {
            this.showCustomConfirm('这是为了刷新上一个聊天缓存数据，如果不是打开新聊天，请不要点击', () => {
              try {
                localStorage.removeItem('guixu_equipped_items');
                localStorage.removeItem('guixu_pending_actions');
                localStorage.removeItem('guixu_auto_write_enabled');
                this.showTemporaryMessage('缓存已清除，页面即将刷新...');
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              } catch (e) {
                console.error('清除本地存储失败:', e);
                this.showTemporaryMessage('清除缓存失败！');
              }
            });
          },

          async executePendingActions() {
            // 指令中心的执行按钮现在总是直接发送
            await this.handleAction();
          },

          useItem(item, buttonElement) {
            const itemName = this.SafeGetValue(item, 'name');
            if (itemName === 'N/A') {
              this.showTemporaryMessage('物品信息错误，无法使用。');
              return;
            }

            // **BUG修复**: 不再手动操作DOM，而是通过刷新背包来更新UI
            // 检查待定队列中的数量，以防止用户超额使用
            const originalQuantity = parseInt(this.SafeGetValue(item, 'quantity', 0), 10);
            const pendingUses = this.pendingActions
              .filter(action => action.action === 'use' && action.itemName === itemName)
              .reduce((total, action) => total + action.quantity, 0);

            if (originalQuantity - pendingUses <= 0) {
              this.showTemporaryMessage(`${itemName} 已用完或已在指令队列中。`);
              return;
            }

            // 更新指令队列
            const existingAction = this.pendingActions.find(
              action => action.action === 'use' && action.itemName === itemName,
            );

            if (existingAction) {
              existingAction.quantity++;
            } else {
              this.pendingActions.push({
                action: 'use',
                itemName: itemName,
                quantity: 1,
              });
            }

            this.showTemporaryMessage(`已将 [使用 ${itemName}] 加入指令队列`);
            this.savePendingActions();

            // 通过重新渲染整个背包来保证UI一致性
            this.showInventory();
          },

          discardItem(item, category, itemElement) {
            const itemName = this.SafeGetValue(item, 'name');
            if (itemName === 'N/A') {
              this.showTemporaryMessage('物品信息错误，无法丢弃。');
              return;
            }

            const hasQuantity = item.hasOwnProperty('quantity');
            
            if (hasQuantity && (category === '丹药' || category === '杂物')) {
              // 有数量的物品，需要输入丢弃数量
              this.promptDiscardQuantity(item, category, itemElement);
            } else {
              // 装备类物品，直接确认丢弃
              this.confirmDiscardItem(item, category, itemElement, 1);
            }
          },

          async promptDiscardQuantity(item, category, itemElement) {
            const itemName = this.SafeGetValue(item, 'name');
            const currentQuantity = parseInt(this.SafeGetValue(item, 'quantity', 0), 10);
            
            // 计算可丢弃的数量（减去待处理队列中的使用和丢弃数量）
            const pendingUses = this.pendingActions
              .filter(action => action.action === 'use' && action.itemName === itemName)
              .reduce((total, action) => total + action.quantity, 0);
            const pendingDiscards = this.pendingActions
              .filter(action => action.action === 'discard' && action.itemName === itemName)
              .reduce((total, action) => total + action.quantity, 0);
            const availableQuantity = currentQuantity - pendingUses - pendingDiscards;

            if (availableQuantity <= 0) {
              this.showTemporaryMessage(`${itemName} 没有可丢弃的数量。`);
              return;
            }

            return new Promise((resolve) => {
              // 创建数量输入模态框
              const modal = document.createElement('div');
              modal.className = 'modal-overlay';
              modal.style.display = 'flex';
              modal.style.zIndex = '2000';
              modal.innerHTML = `
                <div class="modal-content" style="width: 400px; height: auto; max-height: none;">
                  <div class="modal-header">
                    <h2 class="modal-title">丢弃物品</h2>
                  </div>
                  <div class="modal-body" style="padding: 20px;">
                    <p style="margin-bottom: 15px; color: #c9aa71;">请输入要丢弃的 <strong>${itemName}</strong> 数量：</p>
                    <p style="font-size: 12px; color: #8b7355; margin-bottom: 10px;">当前可丢弃数量：${availableQuantity}</p>
                    <input type="number" id="discard-quantity-input" min="1" max="${availableQuantity}" value="1"
                           style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid #8b7355;
                                  color: #e0dcd1; border-radius: 4px; font-size: 14px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                      <button id="discard-quantity-cancel" class="interaction-btn">取消</button>
                      <button id="discard-quantity-confirm" class="interaction-btn" style="background: #8b0000; border-color: #ff6b6b;">确认丢弃</button>
                    </div>
                  </div>
                </div>
              `;

              const container = document.querySelector('.guixu-root-container');
              container.appendChild(modal);

              const input = modal.querySelector('#discard-quantity-input');
              const confirmBtn = modal.querySelector('#discard-quantity-confirm');
              const cancelBtn = modal.querySelector('#discard-quantity-cancel');

              confirmBtn.addEventListener('click', () => {
                const quantity = parseInt(input.value, 10);
                if (isNaN(quantity) || quantity <= 0 || quantity > availableQuantity) {
                  this.showTemporaryMessage('请输入有效的丢弃数量');
                  return;
                }
                modal.remove();
                this.confirmDiscardItem(item, category, itemElement, quantity);
                resolve();
              });

              cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve();
              });

              // 自动聚焦
              setTimeout(() => input.focus(), 100);
            });
          },

          confirmDiscardItem(item, category, itemElement, quantity = 1) {
            const itemName = this.SafeGetValue(item, 'name');
            const hasQuantity = item.hasOwnProperty('quantity');
            
            let confirmMessage;
            if (hasQuantity) {
              confirmMessage = `确定要丢弃 ${quantity} 个 ${itemName} 吗？此操作不可恢复。`;
            } else {
              confirmMessage = `确定要丢弃 ${itemName} 吗？此操作不可恢复。`;
            }

            this.showCustomConfirm(confirmMessage, () => {
              // 添加到指令队列
              this.pendingActions.push({
                action: 'discard',
                itemName: itemName,
                category: category,
                quantity: quantity
              });

              this.savePendingActions();
              
              // 前端乐观显示：刷新背包以反映变化
              this.showInventory();
              
              if (hasQuantity) {
                this.showTemporaryMessage(`已将 [丢弃 ${quantity} 个 ${itemName}] 加入指令队列`);
              } else {
                this.showTemporaryMessage(`已将 [丢弃 ${itemName}] 加入指令队列`);
              }
            });
          },

          showExtractedContent() {
            this.openModal('extracted-content-modal');
            const journeyEl = document.getElementById('extracted-journey');
            const pastLivesEl = document.getElementById('extracted-past-lives');
            const mapCommandsEl = document.getElementById('extracted-map-commands');
            const variablesEl = document.getElementById('extracted-variable-changes');
            const sentPromptEl = document.getElementById('sent-prompt-display');
            const currentMvuEl = document.getElementById('current-mvu-variables');

            if (currentMvuEl) {
              if (this.currentMvuState) {
                currentMvuEl.textContent = JSON.stringify(this.currentMvuState, null, 2);
              } else {
                currentMvuEl.textContent = 'MVU 状态尚未加载。';
              }
            }

            if (sentPromptEl) {
              sentPromptEl.textContent = this.lastSentPrompt || '尚未发送任何内容';
            }
            if (journeyEl) {
              journeyEl.textContent = this.lastExtractedJourney || '未提取到内容';
            }
            if (pastLivesEl) {
              pastLivesEl.textContent = this.lastExtractedPastLives || '未提取到内容';
            }
            if (mapCommandsEl) {
               mapCommandsEl.textContent = this.lastExtractedMapCommands || '未提取到地图指令。';
            }
            if (variablesEl) {
              variablesEl.textContent = this.lastExtractedVariables || '本次无变量改变';
            }
            const novelModeEl = document.getElementById('extracted-novel-mode');
            const novelModeBtn = document.getElementById('btn-write-novel-mode');
            if (novelModeEl && novelModeBtn) {
              // 新逻辑：始终显示提取到的内容。按钮可用性仅取决于内容是否存在。
              novelModeEl.textContent = this.lastExtractedNovelText || '当前AI回复中未提取到正文内容。';
              novelModeBtn.disabled = !this.lastExtractedNovelText;

              // 更新标签文本以提供关于自动写入状态的即时反馈
              const label = document.querySelector('label[for="novel-mode-enabled-checkbox"]');
              if (label) {
                const statusText = this.isNovelModeEnabled ? '开启' : '关闭';
                label.title = `点击切换自动写入状态，当前为：${statusText}`;
              }
            }

            // 新增：处理提取的角色卡
            const characterCardEl = document.getElementById('extracted-character-card');
            const characterCardBtn = document.getElementById('btn-write-character-card');
            if (characterCardEl && characterCardBtn) {
              characterCardEl.textContent = this.lastExtractedCharacterCard || '未提取到角色卡内容。';
              characterCardBtn.disabled = !this.lastExtractedCharacterCard;
            }
          },

          async showJourney() {
            this.openModal('history-modal');
            this.loadUnifiedIndex(); // 确保输入框显示正确的序号
            const titleEl = document.getElementById('history-modal-title');
            if (titleEl) titleEl.textContent = '本世历程';

            // 新增：向模态框头部注入修剪相关的UI元素
            const headerControls = document.querySelector('#history-modal .modal-header > div');
            if (headerControls) {
                 headerControls.innerHTML = ``; // 清空旧的修剪按钮
            }
             // 显示修剪控制台并加载状态
            const trimConsole = document.getElementById('trim-console');
            if (trimConsole) {
                trimConsole.style.display = 'block';
                this.loadTrimFieldsState(); // 确保每次打开都加载最新的状态
            }

            const body = document.getElementById('history-modal-body');
            if (!body) return;

            // 修复BUG：不再完全覆盖innerHTML，而是只更新时间线部分
            const timelinePlaceholder = document.createElement('div');
            timelinePlaceholder.id = 'timeline-placeholder';
            timelinePlaceholder.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在读取命运之卷...</p>';
            
            // 清理旧的时间线并插入占位符
            const existingTimeline = body.querySelector('.timeline-container');
            if (existingTimeline) {
                existingTimeline.remove();
            }
            body.appendChild(timelinePlaceholder);

            try {
              const bookName = '1归墟';
              const index = this.unifiedIndex;
              const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);

              if (!journeyEntry) {
                console.warn(`在世界书 "${bookName}" 中未找到标题为 "${journeyKey}" 的条目。`);
              }
              // 将渲染好的时间线内容替换掉占位符
              timelinePlaceholder.innerHTML = this.renderJourneyFromContent(journeyEntry);
              // 绑定点击事件监听器
              this.bindJourneyListeners();

              // 新增：为动态添加的修剪UI绑定事件
              document.querySelectorAll('.trim-field-checkbox').forEach(checkbox => {
                  checkbox.addEventListener('change', () => this.saveTrimFieldsState());
              });
              document.getElementById('btn-precise-trim')?.addEventListener('click', () => this.handlePreciseTrim());
              document.getElementById('btn-auto-trim')?.addEventListener('click', () => this.handleAutoTrim());
              document.getElementById('btn-full-trim')?.addEventListener('click', () => this.handleFullTrim());

            } catch (error) {
              console.error('读取"本世历程"时出错:', error);
              body.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">读取记忆时出现错误：${error.message}</p>`;
            }
          },

          async showPastLives() {
            this.openModal('history-modal');
            this.loadUnifiedIndex(); // 确保输入框显示正确的序号
            const titleEl = document.getElementById('history-modal-title');
            if (titleEl) titleEl.textContent = '往世涟漪';

            const body = document.getElementById('history-modal-body');
            if (!body) return;

            body.innerHTML =
              '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在回溯时光长河...</p>';
            try {
              const bookName = '1归墟';
              const index = this.unifiedIndex;
              const pastLivesKey = index > 1 ? `往世涟漪(${index})` : '往世涟漪';
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              const pastLivesEntry = allEntries.find(entry => entry.comment === pastLivesKey);

              if (!pastLivesEntry) {
                console.warn(`在世界书 "${bookName}" 中未找到标题为 "${pastLivesKey}" 的条目。`);
              }

              body.innerHTML = this.renderPastLives(pastLivesEntry);
            } catch (error) {
              console.error('读取“往世涟漪”时出错:', error);
              body.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">回溯时光长河时出现错误：${error.message}</p>`;
            }
          },

         async showNovelMode() {
          this.openModal('novel-mode-modal');
          this.loadUnifiedIndex(); // 修复：使用统一序号而不是独立序号
          // 确保小说模式界面的序号输入框显示统一序号
          const input = document.getElementById('novel-mode-index-input');
          if (input) {
            input.value = this.unifiedIndex;
          }
          const titleEl = document.getElementById('novel-mode-modal-title');
          if (titleEl) titleEl.textContent = '小说模式';

          const body = document.getElementById('novel-mode-modal-body');
          const chapterNav = document.getElementById('novel-chapter-nav');
          if (!body) return;

          body.innerHTML = '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在加载小说内容...</p>';
          
          try {
            const bookName = '1归墟';
            const index = this.unifiedIndex; // 修复：使用统一的世界书写入序号
            const novelModeKey = index > 1 ? `小说模式(${index})` : '小说模式';
            const allEntries = await TavernHelper.getLorebookEntries(bookName);
            const novelModeEntry = allEntries.find(entry => entry.comment === novelModeKey);

            if (novelModeEntry && novelModeEntry.content) {
                // 解析章节
                this.novelChapters = this.parseNovelChapters(novelModeEntry.content);
                this.loadNovelBookmarks(); // 加载书签
                this.loadNovelDisplayMode(); // 加载显示模式
                this.loadNovelBackgroundSettings(); // 加载背景设置
                
                if (this.novelChapters.length > 1) {
                    // 显示章节导航
                    if (chapterNav) chapterNav.style.display = 'block';
                    
                    // 更新章节选择器
                    const chapterSelect = document.getElementById('chapter-select');
                    if (chapterSelect) {
                        chapterSelect.innerHTML = '<option value="">选择章节...</option>';
                        this.novelChapters.forEach((chapter, index) => {
                            const option = document.createElement('option');
                            option.value = index;
                            option.textContent = chapter.title;
                            chapterSelect.appendChild(option);
                        });
                    }
                    
                    // 更新书签选择器
                    this.updateBookmarkSelect();
                    
                    // 根据显示模式显示内容
                    if (this.novelDisplayMode === 'continuous') {
                        this.showAllChaptersContinuous();
                    } else {
                        this.showNovelChapter(0);
                    }
                } else {
                    // 没有章节，隐藏导航，显示全部内容
                    if (chapterNav) chapterNav.style.display = 'none';
                    body.innerHTML = `<div class="game-text-container" style="white-space: pre-wrap; padding: 10px;">${this.formatMessageContent(novelModeEntry.content)}</div>`;
                }
                
                // 应用背景设置
                this.applyNovelBackground();
            } else {
                if (chapterNav) chapterNav.style.display = 'none';
                body.innerHTML = '<p style="text-align:center; color:#8b7355; font-size:12px; padding-top: 20px;">该序号下没有小说内容。</p>';
            }

          } catch (error) {
            console.error('读取"小说模式"时出错:', error);
            if (chapterNav) chapterNav.style.display = 'none';
            body.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">读取小说时出现错误：${error.message}</p>`;
          }
        },


          // --- Rendering Logic for Dynamic Content (Lorebooks) ---
          parseJourneyEntry(contentString) {
            if (!contentString || typeof contentString !== 'string') return [];
            try {
              const events = [];
              const eventBlocks = contentString
                .trim()
                .split(/序号\|/g)
                .slice(1);

              eventBlocks.forEach(block => {
                const fullBlock = `序号|${block}`.trim();
                const event = {};
                
                // 定义字段顺序，用于正确解析多行内容
                const fieldOrder = ['序号', '日期', '标题', '地点', '人物', '描述', '人物关系', '标签', '重要信息', '暗线与伏笔', '自动化系统'];
                
                let currentFieldIndex = 0;
                let currentKey = '';
                let currentValue = '';
                
                const lines = fullBlock.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  let foundField = false;
                  
                  // 检查是否是新字段的开始
                  for (let j = currentFieldIndex; j < fieldOrder.length; j++) {
                    const field = fieldOrder[j];
                    if (line.startsWith(field + '|')) {
                      // 保存前一个字段的值
                      if (currentKey && currentValue.trim()) {
                        event[currentKey] = currentValue.trim();
                      }
                      
                      // 开始新字段
                      currentKey = field;
                      currentValue = line.substring(field.length + 1);
                      currentFieldIndex = j;
                      foundField = true;
                      break;
                    }
                  }
                  
                  // 如果不是新字段，则追加到当前字段值
                  if (!foundField && currentKey) {
                    currentValue += '\n' + line;
                  }
                }
                
                // 保存最后一个字段
                if (currentKey && currentValue.trim()) {
                  event[currentKey] = currentValue.trim();
                }
                
                if (event['序号']) {
                  events.push(event);
                }
              });
              return events;
            } catch (e) {
              console.error('解析本世历程条目失败:', e);
              return [];
            }
          },

          parsePastLifeEntry(contentString) {
            if (!contentString || typeof contentString !== 'string') return {};
            try {
                const data = {};
                // 通过前瞻断言 (?=...) 按每个字段的起始标志进行分割，同时保留分隔符
                const parts = contentString.trim().split(/\n(?=^(?:第\d+世|事件脉络|本世概述|本世成就|本世获得物品|本世人物关系网|死亡原因|本世总结|本世评价)\|)/m);

                for (const part of parts) {
                    if (!part.trim()) continue;
                    
                    const separatorIndex = part.indexOf('|');
                    if (separatorIndex > 0) {
                        const key = part.substring(0, separatorIndex).trim();
                        const value = part.substring(separatorIndex + 1).trim();
                        data[key] = value;
                    }
                }
                return data;
            } catch (e) {
              console.error('解析往世涟漪条目失败:', e);
              return {};
            }
          },

          renderJourneyFromContent(entry) {
            if (!entry || !entry.content)
              return '<p style="text-align:center; color:#8b7355; font-size:12px;">此生尚未留下任何印记。</p>';

            const events = this.parseJourneyEntry(entry.content);
            if (events.length === 0)
              return '<p style="text-align:center; color:#8b7355; font-size:12px;">内容格式有误，无法解析事件。</p>';

            events.sort((a, b) => (parseInt(a.序号, 10) || 0) - (parseInt(b.序号, 10) || 0));

            let html = '<div class="timeline-container"><div class="timeline-line"></div>';
            events.forEach((eventData, index) => {
              const eventId = `event-${entry.uid}-${index}`;
              const date = eventData['日期'] || '未知时间';
              const sequence = eventData['序号'] || '?';
              const title = eventData['标题'] || '无标题';
              const displayTitle = `第${sequence}章 ${title}`;
              const location = eventData['地点'] || '未知地点';
              const description = eventData['描述'] || '无详细描述。';
              const characters = eventData['人物'] || '';
              const relationships = eventData['人物关系'] || '';
              const importantInfo = eventData['重要信息'] || '';
              const hiddenPlot = eventData['暗线与伏笔'] || '';
              const autoSystem = eventData['自动化系统'] || '';

              const tagsHtml = (eventData['标签'] || '')
                .split('|')
                .map(tag => tag.trim())
                .filter(tag => tag)
                .map(tag => `<span class="tag-item">${tag}</span>`)
                .join('');

              // 基本信息（默认显示） - 调整了HTML结构以适应新的复选框位置
              const basicInfo = `
                <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                    <div class="timeline-date">${date}</div>
                    <input type="checkbox" class="journey-trim-checkbox" data-sequence-id="${eventData['序号']}" style="cursor: pointer;">
                </div>
                <div class="timeline-tags">${tagsHtml}</div>
                <div class="timeline-title">${displayTitle}</div>
                <div class="timeline-location" style="font-size: 12px; color: #8b7355; margin: 5px 0;">地点：${location}</div>
                <div class="timeline-description">${description}</div>
              `;

              // 详细信息（需要点击3次才显示）
              const detailedInfo = `
                <div class="timeline-detailed-info" id="detailed-${eventId}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(201, 170, 113, 0.3);">
                  ${characters ? `<div class="detail-section"><strong>人物：</strong>${characters}</div>` : ''}
                  ${relationships ? `<div class="detail-section"><strong>人物关系：</strong>${relationships}</div>` : ''}
                  ${importantInfo ? `<div class="detail-section"><strong>重要信息：</strong>${importantInfo}</div>` : ''}
                  ${hiddenPlot ? `<div class="detail-section"><strong>暗线与伏笔：</strong>${hiddenPlot}</div>` : ''}
                  ${autoSystem ? `<div class="detail-section"><strong>自动化系统：</strong><pre style="white-space: pre-wrap; font-size: 11px; color: #a09c91;">${autoSystem}</pre></div>` : ''}
                </div>
              `;

              html += `
                <div class="timeline-event" data-event-id="${eventId}" data-click-count="0" style="cursor: pointer;">
                  <div class="timeline-content">
                    ${basicInfo}
                    ${detailedInfo}
                  </div>
                </div>`;
            });
            html += '</div>';
            return html;
          },

          renderPastLives(entry) {
            if (!entry || !entry.content || !entry.content.trim())
              return '<p style="text-align:center; color:#8b7355; font-size:12px;">未发现任何往世的痕迹。</p>';

            // 使用前瞻断言来分割，这样不会消耗分隔符，可以正确处理每一世的记录
            const pastLifeBlocks = entry.content.trim().split(/\n\n?(?=第\d+世\|)/);
            
            if (pastLifeBlocks.length === 0)
              return '<p style="text-align:center; color:#8b7355; font-size:12px;">内容格式有误，无法解析往世记录。</p>';

            let html = '<div class="timeline-container"><div class="timeline-line"></div>';
            pastLifeBlocks.forEach(block => {
              if (!block.trim()) return; // 跳过可能产生的空块
              const data = this.parsePastLifeEntry(block);
              
              const titleKey = Object.keys(data).find(k => k.startsWith('第') && k.endsWith('世'));
              let title;
              // 修复：检查属性是否存在，而不是值的真假，并为无题的情况提供回退
              if (titleKey && data.hasOwnProperty(titleKey)) {
                  const titleValue = data[titleKey] || '无题';
                  title = `${titleKey} | ${titleValue}`;
              } else {
                  // 如果解析失败，则将块的第一行作为标题
                  title = block.split('\n')[0].trim();
              }

              let detailsHtml = '';
              const fieldOrder = ['事件脉络', '本世概述', '本世成就', '本世获得物品', '本世人物关系网', '死亡原因', '本世总结', '本世评价'];
              fieldOrder.forEach(field => {
                  if (data[field]) {
                      // 使用<pre>标签来保留多行文本的换行和格式
                      const fieldClassMap = {
                        '死亡原因': 'death-reason',
                        '本世成就': 'achievement',
                        '本世获得物品': 'items-obtained',
                        '本世总结': 'summary-evaluation',
                        '本世评价': 'summary-evaluation'
                      };
                      const specificClass = fieldClassMap[field] || '';
                      const itemClass = `detail-item ${specificClass}`.trim();
                      detailsHtml += `<div class="${itemClass}"><strong>${field}:</strong> <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${data[field]}</pre></div>`;
                  }
              });

              html += `
                        <div class="timeline-event">
                            <div class="timeline-content">
                                <div class="timeline-title">${title}</div>
                                <div class="past-life-details">
                                    ${detailsHtml || '<div class="detail-item">内容不详</div>'}
                                </div>
                            </div>
                        </div>`;
            });
            html += '</div>';
            return html;
          },

          async renderPastLifeDetails(bookName) {
            const detailsContainer = document.getElementById('past-life-details');
            if (!detailsContainer) return;
            detailsContainer.style.display = 'block';
            detailsContainer.innerHTML =
              '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">正在读取此世记忆...</p>';
            try {
              const entries = await TavernHelper.getLorebookEntries(bookName, 'summary');
              if (entries && entries.length > 0) {
                const summaryData = JSON.parse(entries[0].content);
                detailsContainer.innerHTML = `
                            <h4>${bookName} - 结局总览</h4>
                            <p><strong>最终境界:</strong> ${summaryData.finalStats.境界}</p>
                            <p><strong>存活时间:</strong> ${summaryData.finalStats.存活时间}</p>
                            <p><strong>主要成就:</strong> ${summaryData.achievements.join('、 ')}</p>
                            <p><strong>最终悔憾:</strong> ${summaryData.regrets}</p>
                            <p><strong>关键事件:</strong></p>
                            <ul style="padding-left: 20px;">${summaryData.keyEvents
                              .map(e => `<li>${e}</li>`)
                              .join('')}</ul>`;
              } else {
                detailsContainer.innerHTML =
                  '<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">未能找到此世的结局总览。</p>';
              }
            } catch (error) {
              console.error(`Error fetching details for ${bookName}:`, error);
              detailsContainer.innerHTML = `<p class="modal-placeholder" style="text-align:center; color:#8b7355; font-size:12px;">读取此世记忆时出错：${error.message}</p>`;
            }
          },

          // --- Dynamic Event Listeners for Lorebook content ---
          bindJourneyListeners() {
            // 为本世历程事件绑定点击监听器
            const timelineContainer = document.querySelector('.timeline-container');
            if (timelineContainer) {
              timelineContainer.addEventListener('click', (e) => {
                const timelineEvent = e.target.closest('.timeline-event');
                if (timelineEvent) {
                  this.handleJourneyEventClick(timelineEvent);
                }
              });
            }
          },

          handleJourneyEventClick(eventElement) {
            const detailedInfo = eventElement.querySelector('.timeline-detailed-info');
            
            // 检查详细信息是否已经显示
            if (detailedInfo && detailedInfo.style.display === 'block') {
              // 如果已显示，则隐藏
              detailedInfo.style.display = 'none';
              eventElement.style.cursor = 'pointer';
              // 重置点击计数，允许重新开始3次点击
              eventElement.dataset.clickCount = '0';
            } else {
              // 如果未显示，继续原有的3次点击逻辑
              const currentCount = parseInt(eventElement.dataset.clickCount || '0', 10);
              const newCount = currentCount + 1;
              eventElement.dataset.clickCount = newCount;

              // 当点击3次时显示详细信息
              if (newCount >= 3) {
                if (detailedInfo) {
                  detailedInfo.style.display = 'block';
                }
                
                // 保持点击样式，允许再次点击隐藏
                eventElement.style.cursor = 'pointer';
              }
            }
          },

          async handleRewind(eventId, eventTitle) {
            // “回溯”按钮相关逻辑已移除
          },

          // 此函数不再需要，提取逻辑已合并到 loadAndDisplayCurrentScene
          processAIResponse() {
            // 空函数或可直接删除
          },

          // --- 新增：写入世界书的核心逻辑 ---
          // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
          async writeJourneyToLorebook(silent = false) {
            const content = this.lastExtractedJourney;
            await this.writeToLorebook('本世历程', content, silent);
          },

          async writePastLivesToLorebook(silent = false) {
            const content = this.lastExtractedPastLives;
            await this.writeToLorebook('往世涟漪', content, silent);
          },

          async writeNovelModeToLorebook(silent = false) {
            const novelText = this.lastExtractedNovelText;
            // 如果没有正文内容，则不执行任何操作
            if (!novelText || novelText.trim() === '') {
              if (!silent) this.showTemporaryMessage('没有可写入的小说正文。');
              return;
            }

            const journeyText = this.lastExtractedJourney;
            let chapterHeader = '';

            // 尝试从本世历程中提取章节信息
            if (journeyText) {
              try {
                const events = this.parseJourneyEntry(journeyText);
                if (events.length > 0) {
                  // 假设数组中最后一个事件是最新的
                  const latestEvent = events[events.length - 1];
                  const sequence = this.SafeGetValue(latestEvent, '序号', null);
                  const title = this.SafeGetValue(latestEvent, '标题', null);

                  if (sequence && title) {
                    chapterHeader = `第${sequence}章 ${title}\n\n`;
                  }
                }
              } catch (e) {
                console.error('为小说模式解析章节标题时出错:', e);
              }
            }

            const finalContent = chapterHeader + novelText;
            await this.writeToLorebook('小说模式', finalContent, silent);
          },

          // 最终版：重构写入逻辑，支持动态索引和条目创建
          async writeToLorebook(baseEntryKey, contentToWrite, silent = false) {
            if (!contentToWrite || contentToWrite.trim() === '') {
              if (!silent) this.showTemporaryMessage('没有可写入的内容。');
              return;
            }

            // 1. 根据序号生成最终的条目名称 - 修复：小说模式也使用统一序号
            const index = this.unifiedIndex; // 所有类型都使用统一的世界书写入序号
            const finalEntryKey = index > 1 ? `${baseEntryKey}(${index})` : baseEntryKey;
            const bookName = '1归墟';

            let reformattedContent = contentToWrite.trim();
            let buttonId;

            // 2. 内容格式化 (逻辑保持不变)
            if (baseEntryKey === '往世涟漪') {
                const parsePastLivesRobust = (text) => {
                    const data = {};
                    const lines = text.trim().split('\n');
                    let currentKey = null;
                    let tempValue = [];
                    const keyRegex = /^(第\d+世|事件脉络|本世概述|本世成就|本世获得物品|本世人物关系网|死亡原因|本世总结|本世评价)\|/;

                    for (const line of lines) {
                        const match = line.match(keyRegex);
                        if (match) {
                            if (currentKey) {
                                data[currentKey] = tempValue.join('\n').trim();
                            }
                            currentKey = match[1];
                            tempValue = [line.substring(match[0].length)];
                        } else if (currentKey) {
                            tempValue.push(line);
                        }
                    }
                    if (currentKey) {
                        data[currentKey] = tempValue.join('\n').trim();
                    }
                    return data;
                };

                const parsedData = parsePastLivesRobust(contentToWrite);
                if (Object.keys(parsedData).length === 0) {
                    if (!silent) this.showTemporaryMessage(`无法解析“${baseEntryKey}”的内容，写入操作已取消。`);
                    return;
                }
                
                const dynamicKey = Object.keys(parsedData).find(k => k.startsWith('第') && k.endsWith('世'));
                const fields = [
                    dynamicKey, '事件脉络', '本世概述', '本世成就', '本世获得物品',
                    '本世人物关系网', '死亡原因', '本世总结', '本世评价',
                ].filter(Boolean);

                reformattedContent = fields
                    .map(key => (parsedData[key] ? `${key}|${parsedData[key]}` : null))
                    .filter(Boolean)
                    .join('\n');
                
                buttonId = 'btn-write-past-lives';

            } else if (baseEntryKey === '本世历程') {
                const journeyFields = ['序号', '日期', '标题', '描述', '标签'];
                const parseContent = (text, fieldList) => {
                  const data = {};
                  let tempText = text.replace(/\r\n/g, '\n');
                  fieldList.forEach((field, fIndex) => {
                    const nextField = fieldList[fIndex + 1];
                    const startMarker = `${field}|`;
                    const startIndex = tempText.indexOf(startMarker);
                    if (startIndex !== -1) {
                      let endIndex;
                      if (nextField) {
                        const nextMarkerIndex = tempText.indexOf(`${nextField}|`, startIndex);
                        endIndex = nextMarkerIndex !== -1 ? nextMarkerIndex : undefined;
                      }
                      let value = tempText.substring(startIndex + startMarker.length, endIndex);
                      data[field] = value.trim();
                    }
                  });
                  return data;
                };
                const parsedData = parseContent(contentToWrite, journeyFields);
                 if (Object.keys(parsedData).length === 0) {
                    if (!silent) this.showTemporaryMessage(`无法解析“${baseEntryKey}”的内容，写入操作已取消。`);
                    return;
                }
                reformattedContent = journeyFields
                    .map(key => (parsedData[key] ? `${key}|${parsedData[key]}` : null))
                    .filter(Boolean)
                    .join('\n');
                buttonId = 'btn-write-journey';
            } else if (baseEntryKey === '小说模式') {
              buttonId = 'btn-write-novel-mode';
            }

            const button = document.getElementById(buttonId);
            if (button && !silent) button.textContent = '写入中...';

            try {
              // 3. 检查条目是否存在，如果不存在则创建
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              let targetEntry = allEntries.find(entry => entry.comment === finalEntryKey);

              if (!targetEntry) {
                if (!silent) this.showTemporaryMessage(`条目 "${finalEntryKey}" 不存在，正在创建...`);
                
                let finalContentToWrite = reformattedContent;
                // 新增：如果是本世历程且开启了自动修剪，则对新创建的内容也进行一次检查（虽然通常是第一个事件，但逻辑上完整）
                if (baseEntryKey === '本世历程' && this.isAutoTrimEnabled) {
                    finalContentToWrite = this._getTrimmedJourneyContent(finalContentToWrite);
                }

                const baseEntryTemplate = allEntries.find(entry => entry.comment === baseEntryKey);
                
                // 构建完整的条目数据，确保所有必需的属性都存在
                const newEntryData = {
                  comment: finalEntryKey,
                  content: finalContentToWrite, // 使用可能被修剪过的内容
                  keys: baseEntryTemplate ? [...baseEntryTemplate.keys, finalEntryKey] : [finalEntryKey],
                  enabled: false,
                  // 复制模板的所有属性，如果没有模板则使用默认值，优先使用保存的设置
                  type: (() => {
                    if (baseEntryKey === '本世历程') return this.worldbookSettings?.journey?.type || baseEntryTemplate?.type || 'selective';
                    if (baseEntryKey === '往世涟漪') return this.worldbookSettings?.pastLives?.type || baseEntryTemplate?.type || 'selective';
                    if (baseEntryKey === '小说模式') return this.worldbookSettings?.novel?.type || baseEntryTemplate?.type || 'selective';
                    if (baseEntryKey === '分段正文') return this.worldbookSettings?.segmented?.type || baseEntryTemplate?.type || 'constant';
                    if (baseEntryKey === '小总结') return this.worldbookSettings?.smallSummary?.type || baseEntryTemplate?.type || 'constant';
                    if (baseEntryKey === '大总结') return this.worldbookSettings?.largeSummary?.type || baseEntryTemplate?.type || 'constant';
                    return baseEntryTemplate?.type || 'selective';
                  })(),
                  position: (() => {
                    if (baseEntryKey === '本世历程') return this.worldbookSettings?.journey?.position || baseEntryTemplate?.position || 'before_character_definition';
                    if (baseEntryKey === '往世涟漪') return this.worldbookSettings?.pastLives?.position || baseEntryTemplate?.position || 'before_character_definition';
                    if (baseEntryKey === '小说模式') return this.worldbookSettings?.novel?.position || baseEntryTemplate?.position || 'before_character_definition';
                    if (baseEntryKey === '分段正文') return this.worldbookSettings?.segmented?.position || baseEntryTemplate?.position || 'before_character_definition';
                    if (baseEntryKey === '小总结') return this.worldbookSettings?.smallSummary?.position || baseEntryTemplate?.position || 'before_character_definition';
                    if (baseEntryKey === '大总结') return this.worldbookSettings?.largeSummary?.position || baseEntryTemplate?.position || 'before_character_definition';
                    return baseEntryTemplate?.position || 'before_character_definition';
                  })(),
                  order: (() => {
                    if (baseEntryKey === '本世历程') return this.worldbookSettings?.journey?.order || baseEntryTemplate?.order || 20;
                    if (baseEntryKey === '往世涟漪') return this.worldbookSettings?.pastLives?.order || baseEntryTemplate?.order || 19;
                    if (baseEntryKey === '小说模式') return this.worldbookSettings?.novel?.order || baseEntryTemplate?.order || 18;
                    if (baseEntryKey === '分段正文') return this.worldbookSettings?.segmented?.order || baseEntryTemplate?.order || 21;
                    if (baseEntryKey === '小总结') return this.worldbookSettings?.smallSummary?.order || baseEntryTemplate?.order || 20;
                    if (baseEntryKey === '大总结') return this.worldbookSettings?.largeSummary?.order || baseEntryTemplate?.order || 19;
                    return baseEntryTemplate?.order || 20;
                  })(),
                  filters: baseEntryTemplate?.filters || [],
                  scan_depth: baseEntryTemplate?.scan_depth || 'same_as_global',
                  case_sensitive: baseEntryTemplate?.case_sensitive || 'same_as_global',
                  match_whole_words: baseEntryTemplate?.match_whole_words || 'same_as_global',
                  use_group_scoring: baseEntryTemplate?.use_group_scoring || 'same_as_global',
                  probability: baseEntryTemplate?.probability !== undefined ? baseEntryTemplate.probability : 100,
                  exclude_recursion: baseEntryTemplate?.exclude_recursion || false,
                  prevent_recursion: baseEntryTemplate?.prevent_recursion || false,
                  delay_until_recursion: baseEntryTemplate?.delay_until_recursion || false,
                  depth: (() => {
                    const position = (() => {
                      if (baseEntryKey === '本世历程') return this.worldbookSettings?.journey?.position || baseEntryTemplate?.position || 'before_character_definition';
                      if (baseEntryKey === '往世涟漪') return this.worldbookSettings?.pastLives?.position || baseEntryTemplate?.position || 'before_character_definition';
                      if (baseEntryKey === '小说模式') return this.worldbookSettings?.novel?.position || baseEntryTemplate?.position || 'before_character_definition';
                      if (baseEntryKey === '分段正文') return this.worldbookSettings?.segmented?.position || baseEntryTemplate?.position || 'before_character_definition';
                      if (baseEntryKey === '小总结') return this.worldbookSettings?.smallSummary?.position || baseEntryTemplate?.position || 'before_character_definition';
                      if (baseEntryKey === '大总结') return this.worldbookSettings?.largeSummary?.position || baseEntryTemplate?.position || 'before_character_definition';
                      return baseEntryTemplate?.position || 'before_character_definition';
                    })();
                    
                    if (position.startsWith('at_depth')) {
                      if (baseEntryKey === '本世历程') return this.worldbookSettings?.journey?.depth || baseEntryTemplate?.depth || 1;
                      if (baseEntryKey === '往世涟漪') return this.worldbookSettings?.pastLives?.depth || baseEntryTemplate?.depth || 1;
                      if (baseEntryKey === '小说模式') return this.worldbookSettings?.novel?.depth || baseEntryTemplate?.depth || 1;
                      if (baseEntryKey === '分段正文') return this.worldbookSettings?.segmented?.depth || baseEntryTemplate?.depth || 1;
                      if (baseEntryKey === '小总结') return this.worldbookSettings?.smallSummary?.depth || baseEntryTemplate?.depth || 1;
                      if (baseEntryKey === '大总结') return this.worldbookSettings?.largeSummary?.depth || baseEntryTemplate?.depth || 1;
                      return baseEntryTemplate?.depth || 1;
                    }
                    return null;
                  })(),
                  automation_id: baseEntryTemplate?.automation_id || null,
                  group: baseEntryTemplate?.group || '',
                  group_prioritized: baseEntryTemplate?.group_prioritized || false,
                  group_weight: baseEntryTemplate?.group_weight || 100,
                  sticky: baseEntryTemplate?.sticky || null,
                  cooldown: baseEntryTemplate?.cooldown || null,
                  delay: baseEntryTemplate?.delay || null
                };

                await TavernHelper.createLorebookEntries(bookName, [newEntryData]);
                if (!silent) this.showTemporaryMessage(`已成功创建并写入到“${finalEntryKey}”。`);
                
                if (this.isAutoToggleLorebookEnabled) {
                    this.updateAutoToggledEntries();
                }

              } else {
                // 4. 如果条目存在，则根据类型决定是追加还是覆盖
                let updatedContent;

                if (baseEntryKey === '小说模式') {
                    // 对于小说模式，检查重复后追加内容
                    const existingContent = targetEntry.content || '';
                    if (existingContent.includes(reformattedContent.trim())) {
                        if (!silent) this.showTemporaryMessage(`内容已存在，跳过写入。`);
                        console.log(`[归墟] 内容重复 (小说模式)，跳过写入: ${finalEntryKey}`);
                        if (button && !silent) {
                            button.textContent = '写入世界书';
                        }
                        return;
                    }
                    updatedContent = existingContent + (existingContent ? '\n\n' : '') + reformattedContent;
                    if (!silent) this.showTemporaryMessage(`已成功追加内容到“${finalEntryKey}”`);
                } else {
                    // 对于其他类型（如本世历程），检查重复后追加内容
                    const existingContent = targetEntry.content || '';

                    // 新增：基于序号的更可靠的重复检查，以解决修剪冲突
                    const getSeq = (text) => {
                        if (!text) return null;
                        // Match '序号|' at the very beginning of the block
                        const match = text.match(/^序号\|(\d+)/);
                        return match ? match[1] : null;
                    };

                    const newEventSeq = getSeq(reformattedContent.trim());
                    let isDuplicate = false;

                    if (newEventSeq && baseEntryKey === '本世历程') {
                        const existingSequences = (existingContent)
                            .split('\n\n') // Events are separated by double newlines
                            .map(block => getSeq(block.trim()))
                            .filter(seq => seq !== null);
                        
                        if (existingSequences.includes(newEventSeq)) {
                            isDuplicate = true;
                        }
                    } else {
                        // 如果新内容没有序号，或不是“本世历程”，则退回旧的基于内容的检查
                        isDuplicate = existingContent.includes(reformattedContent.trim());
                    }

                    if (isDuplicate) {
                        const message = newEventSeq ? `事件 (序号 ${newEventSeq}) 已存在` : '内容已存在';
                        if (!silent) this.showTemporaryMessage(`${message}，跳过写入。`);
                        console.log(`[归墟] 内容重复 (${message})，跳过写入: ${finalEntryKey}`);

                        if (baseEntryKey === '本世历程') this.lastWrittenJourney = this.lastExtractedJourney;
                        if (baseEntryKey === '往世涟漪') this.lastWrittenPastLives = this.lastExtractedPastLives;

                        if (button && !silent) {
                            button.textContent = '写入世界书';
                        }
                        return; // 提前退出函数
                    }

                    updatedContent = existingContent + (existingContent ? '\n\n' : '') + reformattedContent;
                    if (!silent) this.showTemporaryMessage(`已成功追加内容到“${finalEntryKey}”`);
                }
                
                // 核心修复：在合并内容后、写入之前执行修剪
                if (baseEntryKey === '本世历程' && this.isAutoTrimEnabled) {
                    console.log('[归墟] 自动修剪已开启，正在处理合并后的内容...');
                    updatedContent = this._getTrimmedJourneyContent(updatedContent);
                }

                await TavernHelper.setLorebookEntries(bookName, [{ uid: targetEntry.uid, content: updatedContent }]);
              }

              if (button && !silent) {
                button.textContent = '写入成功';
                setTimeout(() => { button.textContent = '写入世界书'; }, 2000);
              }

            } catch (error) {
              console.error(`写入世界书 "${finalEntryKey}" 时出错:`, error);
              if (!silent) {
                this.showTemporaryMessage(`写入失败: ${error.message}`);
                if (button) button.textContent = '写入失败';
              }
            } finally {
                if (button && !silent && button.textContent === '写入中...') {
                    button.textContent = '写入世界书';
                }
            }
          },

          async writeCharacterCardToLorebook() {
            const content = this.lastExtractedCharacterCard;
            if (!content) {
              this.showTemporaryMessage('没有可写入的角色内容。');
              return;
            }

            const button = document.getElementById('btn-write-character-card');
            if (button) button.textContent = '写入中...';

            try {
              const lines = content.trim().split('\n');
              const characterData = {};
              lines.forEach(line => {
                const parts = line.split('|');
                if (parts.length >= 2) {
                  const key = parts[0].trim();
                  const value = parts.slice(1).join('|').trim();
                  characterData[key] = value;
                }
              });

              const characterName = characterData['姓名'];
              if (!characterName) {
                throw new Error('无法从提取内容中找到角色“姓名”。');
              }

              const bookName = '1归墟';
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              const existingEntry = allEntries.find(entry => entry.comment === characterName);

              if (existingEntry) {
                this.showTemporaryMessage(`角色“${characterName}”已存在，请手动修改。`);
                if (button) button.textContent = '写入世界书';
                return;
              }

              await TavernHelper.createLorebookEntries(bookName, [
                {
                  comment: characterName,
                  keys: [characterName],
                  content: content.trim(),
                  enabled: true,
                },
              ]);

              this.showTemporaryMessage(`已成功创建角色“${characterName}”。`);
              if (button) button.textContent = '写入成功';
              setTimeout(() => {
                if (button) button.textContent = '写入世界书';
              }, 2000);
            } catch (error) {
              console.error('写入角色卡到世界书时出错:', error);
              this.showTemporaryMessage(`写入失败: ${error.message}`);
              if (button) button.textContent = '写入失败';
            }
          },

          async updateCurrentSceneLorebook(sceneContent) {
            // 增加健壮性检查，防止写入空内容
            if (!sceneContent || sceneContent.trim() === '') {
              console.warn('[归墟] 尝试向“当前场景”写入空内容，操作已取消。');
              return;
            }
            const bookName = '1归墟';
            const sceneKey = '当前场景';
            try {
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              const sceneEntry = allEntries.find(entry => entry.comment === sceneKey);

              if (!sceneEntry) {
                console.warn(
                  `[归墟] 未找到世界书条目 "${sceneKey}"，无法更新场景正文。请在'${bookName}'世界书中创建它。`,
                );
                // 如果条目不存在，我们可以选择创建一个
                await TavernHelper.createLorebookEntries(bookName, [
                  {
                    comment: sceneKey,
                    content: sceneContent,
                    keys: [],
                  },
                ]);
                console.log(`[归墟] 已创建并更新 "${sceneKey}" 内容。`);
                return;
              }

              // 使用覆盖式更新
              await TavernHelper.setLorebookEntries(bookName, [{ uid: sceneEntry.uid, content: sceneContent }]);
              console.log(`[归墟] 成功更新 "${sceneKey}" 内容。`);
            } catch (error) {
              console.error(`[归墟] 更新 "${sceneKey}" 时出错:`, error);
            }
          },

          async loadAndDisplayCurrentScene(messageContent = null) {
            const gameTextDisplay = document.getElementById('game-text-display');
            if (!gameTextDisplay) return;

            try {
              let contentToParse = messageContent;

              // 如果没有直接提供内容，则从聊天记录中获取
              if (contentToParse === null) {
                const messages = await getChatMessages(getCurrentMessageId());
                if (!messages || messages.length === 0) return;
                const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant');
                if (lastAiMessage) {
                  contentToParse = lastAiMessage.message;
                }
              }

              if (contentToParse) {
                // --- 诊断报告注入点 ---
                console.groupCollapsed('[归墟染色诊断报告]');
                console.log('1. [原始加载内容]', contentToParse);

                // 1. 更新主界面正文 (使用新的健壮的提取函数)
                const displayText = this._getDisplayText(contentToParse);
                console.log('2. [提取后用于显示]', displayText);

                const finalHTML = this.formatMessageContent(displayText);
                console.log('3. [最终渲染HTML]', finalHTML);
                
                gameTextDisplay.innerHTML = finalHTML;
                this.updateLiveWordCount(); // 新增：调用字数统计函数
                console.groupEnd();
                // --- 诊断报告结束 ---

                // 2. 同步提取所有标签内容到变量，用于“查看提取内容”模态框
                this.lastExtractedNovelText = this._extractLastTagContent('gametxt', contentToParse);
                this.lastExtractedJourney = this._extractLastTagContent('本世历程', contentToParse);
                this.lastExtractedPastLives = this._extractLastTagContent('往世涟漪', contentToParse);
                this.lastExtractedVariables = this._extractLastTagContent('UpdateVariable', contentToParse, true); // ignore case
                this.lastExtractedCharacterCard = this._extractLastTagContent('角色提取', contentToParse);
                this.lastExtractedMapCommands = this._extractLastTagContent('地图', contentToParse);

                // 新增：更新变量改变提醒
                this.updateVariableChangesReminder();

                // 3. 新增：提取并渲染行动选项
                let actionOptionsContent = this._extractLastTagContent('行动选项', contentToParse);
                if (!actionOptionsContent) {
                   actionOptionsContent = this._extractLastTagContent('action', contentToParse);
                }
                this.renderActionOptions(actionOptionsContent);
              }
            } catch (error) {
              console.error(`[归墟] 加载并显示当前场景时出错:`, error);
              gameTextDisplay.innerHTML = `<gametxt>加载场景时出错。</gametxt>`;
              this.updateLiveWordCount(); // 新增：调用字数统计函数
            }
          },

          // --- 新增：行动选项渲染函数 ---
          renderActionOptions(content) {
            const container = document.getElementById('action-options-container');
            if (!container) return;

            container.innerHTML = ''; // 清空旧选项

            const hasContent = content && typeof content === 'string' && content.trim() !== '';

            // 如果开关关闭或没有有效内容，则隐藏容器并返回
            if (!this.isActionOptionsEnabled || !hasContent) {
                container.style.display = 'none';
                return;
            }

            // 有内容则显示容器
            container.style.display = 'block';

            const lines = content.trim().split('\n');
            lines.forEach(line => {
                line = line.trim();
                const match = line.match(/^(?:\d+\.\s*)?(.+)/);
                if (match) {
                    const optionText = match[1].trim();
                    if (optionText) {
                        const btn = document.createElement('button');
                        btn.className = 'action-option-btn';
                        btn.textContent = optionText;
                        btn.dataset.actionText = optionText; // 将选项文本存入data属性
                        btn.style.display = 'block';
                        btn.style.width = '100%';
                        container.appendChild(btn);
                    }
                }
            });

            // 如果解析后没有生成任何按钮，也隐藏容器
            if (container.childElementCount === 0) {
                container.style.display = 'none';
            }
          },

          // --- 新增：状态保存与自动写入逻辑 ---
          saveAutoWriteState(state) {
            try {
              localStorage.setItem('guixu_auto_write_enabled', state);
            } catch (e) {
              console.error('保存自动写入状态失败:', e);
            }
          },

          loadAutoWriteState() {
            try {
              const savedState = localStorage.getItem('guixu_auto_write_enabled');
              // 如果localStorage中没有保存过状态，则默认为true (开启)
              this.isAutoWriteEnabled = savedState === null ? true : savedState === 'true';
              const checkbox = document.getElementById('auto-write-checkbox');
              if (checkbox) {
                checkbox.checked = this.isAutoWriteEnabled;
              }
              // 根据加载的状态决定是否启动轮询
              if (this.isAutoWriteEnabled) {
                this.startAutoWritePolling();
              }
            } catch (e) {
              console.error('加载自动写入状态失败:', e);
              this.isAutoWriteEnabled = false;
            }
          },

          saveNovelModeState(state) {
            try {
              localStorage.setItem('guixu_novel_mode_enabled', state);
            } catch (e) {
              console.error('保存小说模式状态失败:', e);
            }
          },

          loadNovelModeState() {
            try {
              const savedState = localStorage.getItem('guixu_novel_mode_enabled');
              // 小说模式默认为 false (关闭)
              this.isNovelModeEnabled = savedState === 'true';
              const checkbox = document.getElementById('novel-mode-enabled-checkbox');
              if (checkbox) {
                checkbox.checked = this.isNovelModeEnabled;
              }
              // 根据加载的状态决定是否启动小说模式的轮询
              if (this.isNovelModeEnabled) {
                this.startNovelModeAutoWritePolling();
              }
            } catch (e) {
              console.error('加载小说模式状态失败:', e);
              this.isNovelModeEnabled = false;
            }
          },

          startAutoWritePolling() {
            this.stopAutoWritePolling();
            console.log('[归墟] 启动自动写入轮询 (setTimeout模式)...');
            const poll = async () => {
                if (!this.isAutoWriteEnabled) return;

                // Check for new Journey content
                if (this.lastExtractedJourney && this.lastExtractedJourney !== this.lastWrittenJourney) {
                    await this.writeJourneyToLorebook(true);
                    this.lastWrittenJourney = this.lastExtractedJourney; // Mark as written
                }

                // Check for new Past Lives content
                if (this.lastExtractedPastLives && this.lastExtractedPastLives !== this.lastWrittenPastLives) {
                    await this.writePastLivesToLorebook(true);
                    this.lastWrittenPastLives = this.lastExtractedPastLives; // Mark as written
                }

                // Schedule next poll
                if (this.isAutoWriteEnabled) {
                    this.autoWriteIntervalId = setTimeout(poll, 2000);
                }
            };
            this.autoWriteIntervalId = setTimeout(poll, 2000);
          },

          stopAutoWritePolling() {
            if (this.autoWriteIntervalId) {
              console.log('[归墟] 停止自动写入轮询。');
              clearTimeout(this.autoWriteIntervalId); // 改为 clearTimeout
              this.autoWriteIntervalId = null;
            }
          },

          // --- 新增：小说模式自动写入轮询 ---
          startNovelModeAutoWritePolling() {
            this.stopNovelModeAutoWritePolling();
            console.log('[归墟] 启动小说模式自动写入轮询 (setTimeout模式)...');
            const poll = async () => {
                if (!this.isNovelModeEnabled) return;

                // Check for new Novel Mode content
                if (this.lastExtractedNovelText && this.lastExtractedNovelText !== this.lastWrittenNovelText) {
                    await this.writeNovelModeToLorebook(true);
                    this.lastWrittenNovelText = this.lastExtractedNovelText; // Mark as written
                }

                if (this.isNovelModeEnabled) {
                    this.novelModeAutoWriteIntervalId = setTimeout(poll, 2000);
                }
            };
            this.novelModeAutoWriteIntervalId = setTimeout(poll, 2000);
          },

          stopNovelModeAutoWritePolling() {
            if (this.novelModeAutoWriteIntervalId) {
              console.log('[归墟] 停止小说模式自动写入轮询。');
              clearTimeout(this.novelModeAutoWriteIntervalId); // 改为 clearTimeout
              this.novelModeAutoWriteIntervalId = null;
            }
          },

          // --- 新增：装备状态保存与加载 ---
          startMapUpdatePolling() {
            this.stopMapUpdatePolling();
            console.log('[归墟] 启动地图指令自动解析轮询 (setTimeout模式)...');
            const poll = async () => {
                if (this.lastExtractedMapCommands) {
                    await this.handleMapUpdateCommand(this.lastExtractedMapCommands);
                    this.lastExtractedMapCommands = null;
                }
                // 地图轮询应该持续进行，所以不需要检查特定开关
                this.mapUpdateIntervalId = setTimeout(poll, 2500);
            };
            this.mapUpdateIntervalId = setTimeout(poll, 2500);
          },

          stopMapUpdatePolling() {
            if (this.mapUpdateIntervalId) {
              console.log('[归墟] 停止地图指令自动解析轮询。');
              clearTimeout(this.mapUpdateIntervalId); // 改为 clearTimeout
              this.mapUpdateIntervalId = null;
            }
          },
          
          saveEquipmentState() {
            try {
              localStorage.setItem('guixu_equipped_items', JSON.stringify(this.equippedItems));
            } catch (e) {
              console.error('保存装备状态失败:', e);
            }
          },

          // **逻辑重构**: 彻底简化的加载函数
          loadEquipmentState() {
            try {
              const savedState = localStorage.getItem('guixu_equipped_items');
              if (savedState) {
                const loadedItems = JSON.parse(savedState);
                if (!loadedItems) return;

                this.equippedItems = loadedItems;

                const defaultTextMap = {
                  wuqi: '武器',
                  fangju: '防具',
                  shipin: '饰品',
                  fabao1: '法宝',
                  zhuxiuGongfa: '主修功法',
                  fuxiuXinfa: '辅修心法',
                };

                // 直接用 localStorage 的数据渲染UI
                for (const slotKey in defaultTextMap) {
                  const slotElement = document.getElementById(`equip-${slotKey}`);
                  if (!slotElement) continue;

                  const itemData = this.equippedItems[slotKey];

                  if (itemData && typeof itemData === 'object') {
                    const tier = this.SafeGetValue(itemData, 'tier', '凡品');
                    const tierStyle = this.getItemTierStyle(tier);
                    slotElement.textContent = this.SafeGetValue(itemData, 'name');
                    slotElement.setAttribute('style', tierStyle);
                    slotElement.classList.add('equipped');
                    slotElement.dataset.itemDetails = JSON.stringify(itemData).replace(/'/g, "'");
                  } else {
                    slotElement.textContent = defaultTextMap[slotKey];
                    slotElement.classList.remove('equipped');
                    slotElement.removeAttribute('style');
                    delete slotElement.dataset.itemDetails;
                  }
                }
                this.updateDisplayedAttributes();
              }
            } catch (e) {
              console.error('加载装备状态失败:', e);
              localStorage.removeItem('guixu_equipped_items');
            }
          },

          savePendingActions() {
            try {
              localStorage.setItem('guixu_pending_actions', JSON.stringify(this.pendingActions));
            } catch (e) {
              console.error('保存指令队列状态失败:', e);
            }
          },

          loadPendingActions() {
            try {
              const savedActions = localStorage.getItem('guixu_pending_actions');
              if (savedActions) {
                this.pendingActions = JSON.parse(savedActions) || [];
              }
            } catch (e) {
              console.error('加载指令队列状态失败:', e);
              this.pendingActions = [];
              localStorage.removeItem('guixu_pending_actions');
            }
          },
 
          // --- 新增：统一读写序号存取 ---
          saveUnifiedIndex() {
            try {
              localStorage.setItem('guixu_unified_index', this.unifiedIndex);
            } catch (e) {
              console.error('保存统一读写序号失败:', e);
            }
          },
 
          loadUnifiedIndex() {
            try {
              const savedIndex = localStorage.getItem('guixu_unified_index');
              if (savedIndex) {
                this.unifiedIndex = parseInt(savedIndex, 10) || 1;
              }
              const input = document.getElementById('unified-index-input');
              if (input) {
                input.value = this.unifiedIndex;
              }
            } catch (e) {
              console.error('加载统一读写序号失败:', e);
              this.unifiedIndex = 1; // 出错时重置为1
            }
          },

          // --- 新增：小说模式独立读写序号存取 ---
          saveNovelModeIndex() {
           try {
             localStorage.setItem('guixu_novel_mode_index', this.novelModeIndex);
           } catch (e) {
             console.error('保存小说模式读写序号失败:', e);
           }
          },

          loadNovelModeIndex() {
           try {
             const savedIndex = localStorage.getItem('guixu_novel_mode_index');
             if (savedIndex) {
               this.novelModeIndex = parseInt(savedIndex, 10) || 1;
             }
             const input = document.getElementById('novel-mode-index-input');
             if (input) {
               input.value = this.novelModeIndex;
             }
           } catch (e) {
             console.error('加载小说模式读写序号失败:', e);
             this.novelModeIndex = 1; // 出错时重置为1
           }
          },

          // --- 新增：小说模式章节和书签功能 ---
          novelChapters: [], // 存储解析出的章节信息
          novelBookmarks: [], // 存储书签信息
          currentChapterIndex: 0, // 当前章节索引
          novelDisplayMode: 'single', // 显示模式：single(单章节) 或 continuous(连贯显示)
          novelBackgroundEnabled: false, // 小说模式背景图开关
          novelBackgroundOpacity: 0.3, // 小说模式背景透明度
          novelBackgroundImage: '', // 小说模式背景图片URL

          // 解析小说内容中的章节
          parseNovelChapters(content) {
            if (!content) return [];
            
            const chapters = [];
            const lines = content.split('\n');
            let currentChapter = null;
            let chapterContent = [];
            let lineIndex = 0;

            for (const line of lines) {
              // 匹配章节标题：第x章 或 第x回 等格式
              const chapterMatch = line.match(/^\s*(第\s*[零一二三四五六七八九十百千万\d]+\s*[章回节部卷篇].*?)$/);
              
              if (chapterMatch) {
                // 保存上一章节
                if (currentChapter) {
                  currentChapter.content = chapterContent.join('\n');
                  currentChapter.endLine = lineIndex - 1;
                  chapters.push(currentChapter);
                }
                
                // 开始新章节
                currentChapter = {
                  title: chapterMatch[1].trim(),
                  startLine: lineIndex,
                  endLine: -1,
                  content: ''
                };
                chapterContent = [line];
              } else if (currentChapter) {
                chapterContent.push(line);
              } else {
                // 没有章节标题的内容，归入"序章"
                if (chapters.length === 0) {
                  chapters.push({
                    title: '序章',
                    startLine: 0,
                    endLine: -1,
                    content: ''
                  });
                  currentChapter = chapters[0];
                  chapterContent = [];
                }
                chapterContent.push(line);
              }
              lineIndex++;
            }

            // 保存最后一章
            if (currentChapter) {
              currentChapter.content = chapterContent.join('\n');
              currentChapter.endLine = lineIndex - 1;
              if (!chapters.includes(currentChapter)) {
                chapters.push(currentChapter);
              }
            }

            return chapters;
          },

          // 保存书签
          saveNovelBookmarks() {
            try {
              const key = `guixu_novel_bookmarks_${this.unifiedIndex}`;
              localStorage.setItem(key, JSON.stringify(this.novelBookmarks));
            } catch (e) {
              console.error('保存小说书签失败:', e);
            }
          },

          // 加载书签
          loadNovelBookmarks() {
            try {
              const key = `guixu_novel_bookmarks_${this.unifiedIndex}`;
              const saved = localStorage.getItem(key);
              this.novelBookmarks = saved ? JSON.parse(saved) : [];
            } catch (e) {
              console.error('加载小说书签失败:', e);
              this.novelBookmarks = [];
            }
          },

          // 添加书签
          addNovelBookmark() {
            const chapterSelect = document.getElementById('chapter-select');
            const currentChapter = chapterSelect.value;
            
            if (!currentChapter) {
              this.showTemporaryMessage('请先选择一个章节', 'error');
              return;
            }

            const chapterTitle = chapterSelect.options[chapterSelect.selectedIndex].text;
            const timestamp = new Date().toLocaleString('zh-CN');
            
            const bookmark = {
              id: Date.now(),
              chapterIndex: parseInt(currentChapter),
              chapterTitle: chapterTitle,
              timestamp: timestamp,
              note: `${chapterTitle} - ${timestamp}`
            };

            // 检查是否已存在相同章节的书签
            const existingIndex = this.novelBookmarks.findIndex(b => b.chapterIndex === bookmark.chapterIndex);
            if (existingIndex >= 0) {
              this.novelBookmarks[existingIndex] = bookmark;
              this.showTemporaryMessage('书签已更新');
            } else {
              this.novelBookmarks.push(bookmark);
              this.showTemporaryMessage('书签已添加');
            }

            this.saveNovelBookmarks();
            this.updateBookmarkSelect();
          },

          // 更新书签选择器
          updateBookmarkSelect() {
            const select = document.getElementById('bookmark-select');
            if (!select) return;

            select.innerHTML = '<option value="">选择书签...</option>';
            
            this.novelBookmarks.forEach(bookmark => {
              const option = document.createElement('option');
              option.value = bookmark.chapterIndex;
              option.textContent = bookmark.note;
              select.appendChild(option);
            });
          },

          // 跳转到书签
          gotoBookmark() {
            const bookmarkSelect = document.getElementById('bookmark-select');
            const chapterIndex = parseInt(bookmarkSelect.value);
            
            if (isNaN(chapterIndex)) {
              this.showTemporaryMessage('请选择一个书签', 'error');
              return;
            }

            this.showNovelChapter(chapterIndex);
            this.showTemporaryMessage('已跳转到书签位置');
          },

          // 删除书签
          deleteBookmark() {
            const bookmarkSelect = document.getElementById('bookmark-select');
            const chapterIndex = parseInt(bookmarkSelect.value);
            
            if (isNaN(chapterIndex)) {
              this.showTemporaryMessage('请选择要删除的书签', 'error');
              return;
            }

            const bookmarkIndex = this.novelBookmarks.findIndex(b => b.chapterIndex === chapterIndex);
            if (bookmarkIndex >= 0) {
              this.novelBookmarks.splice(bookmarkIndex, 1);
              this.saveNovelBookmarks();
              this.updateBookmarkSelect();
              this.showTemporaryMessage('书签已删除');
            }
          },

          // 显示指定章节
          showNovelChapter(chapterIndex) {
            if (!this.novelChapters || chapterIndex >= this.novelChapters.length) return;

            const chapter = this.novelChapters[chapterIndex];
            const body = document.getElementById('novel-mode-modal-body');
            
            if (body && chapter) {
              // 使用格式化内容显示章节
              const formattedContent = this.formatMessageContent(chapter.content);
              
              // 创建章节内容容器
              const chapterContainer = document.createElement('div');
              chapterContainer.className = 'single-chapter-container';
              chapterContainer.style.cssText = 'position: relative; min-height: 100%;';
              
              // 添加章节内容
              chapterContainer.innerHTML = `
                <div class="game-text-container" style="white-space: pre-wrap; padding: 10px; padding-bottom: 80px;">
                  ${formattedContent}
                </div>
              `;
              
              // 添加底部导航（仅在单章节模式下）
              if (this.novelDisplayMode === 'single' && this.novelChapters.length > 1) {
                const bottomNav = this.createBottomChapterNav(chapterIndex);
                chapterContainer.appendChild(bottomNav);
              }
              
              body.innerHTML = '';
              body.appendChild(chapterContainer);
              
              // 更新章节选择器
              const chapterSelect = document.getElementById('chapter-select');
              if (chapterSelect) {
                chapterSelect.value = chapterIndex;
              }
              
              this.currentChapterIndex = chapterIndex;
              this.updateChapterNavButtons();
            }
          },

          // 创建底部章节导航
          createBottomChapterNav(currentIndex) {
            const nav = document.createElement('div');
            nav.className = 'bottom-chapter-nav';
            nav.style.cssText = `
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: rgba(15, 15, 35, 0.7);
              backdrop-filter: blur(5px);
              border-top: 1px solid rgba(139, 115, 85, 0.3);
              padding: 10px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              opacity: 0.8;
              transition: opacity 0.3s ease;
            `;
            
            // 鼠标悬停时增加不透明度
            nav.addEventListener('mouseenter', () => {
              nav.style.opacity = '1';
            });
            nav.addEventListener('mouseleave', () => {
              nav.style.opacity = '0.8';
            });
            
            // 上一章按钮
            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '← 上一章';
            prevBtn.style.cssText = `
              background: rgba(139, 115, 85, 0.8);
              color: #c9aa71;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              transition: background 0.3s ease;
            `;
            
            if (currentIndex <= 0) {
              prevBtn.disabled = true;
              prevBtn.style.opacity = '0.5';
              prevBtn.style.cursor = 'not-allowed';
            } else {
              prevBtn.addEventListener('click', () => this.prevChapter());
              prevBtn.addEventListener('mouseenter', () => {
                prevBtn.style.background = 'rgba(139, 115, 85, 1)';
              });
              prevBtn.addEventListener('mouseleave', () => {
                prevBtn.style.background = 'rgba(139, 115, 85, 0.8)';
              });
            }
            
            // 章节信息
            const chapterInfo = document.createElement('span');
            chapterInfo.textContent = `${currentIndex + 1} / ${this.novelChapters.length}`;
            chapterInfo.style.cssText = `
              color: #8b7355;
              font-size: 11px;
              user-select: none;
            `;
            
            // 下一章按钮
            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '下一章 →';
            nextBtn.style.cssText = `
              background: rgba(139, 115, 85, 0.8);
              color: #c9aa71;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              transition: background 0.3s ease;
            `;
            
            if (currentIndex >= this.novelChapters.length - 1) {
              nextBtn.disabled = true;
              nextBtn.style.opacity = '0.5';
              nextBtn.style.cursor = 'not-allowed';
            } else {
              nextBtn.addEventListener('click', () => this.nextChapter());
              nextBtn.addEventListener('mouseenter', () => {
                nextBtn.style.background = 'rgba(139, 115, 85, 1)';
              });
              nextBtn.addEventListener('mouseleave', () => {
                nextBtn.style.background = 'rgba(139, 115, 85, 0.8)';
              });
            }
            
            nav.appendChild(prevBtn);
            nav.appendChild(chapterInfo);
            nav.appendChild(nextBtn);
            
            return nav;
          },

          // 更新章节导航按钮状态
          updateChapterNavButtons() {
            const prevBtn = document.getElementById('prev-chapter-btn');
            const nextBtn = document.getElementById('next-chapter-btn');
            
            if (prevBtn) {
              prevBtn.disabled = this.currentChapterIndex <= 0;
              prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            }
            
            if (nextBtn) {
              nextBtn.disabled = this.currentChapterIndex >= this.novelChapters.length - 1;
              nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            }
          },

          // 上一章
          prevChapter() {
            if (this.currentChapterIndex > 0) {
              this.showNovelChapter(this.currentChapterIndex - 1);
            }
          },

          // 下一章
          nextChapter() {
            if (this.currentChapterIndex < this.novelChapters.length - 1) {
              this.showNovelChapter(this.currentChapterIndex + 1);
            }
          },

          // 切换显示模式
          switchNovelDisplayMode(mode) {
            this.novelDisplayMode = mode;
            this.saveNovelDisplayMode();
            
            // 更新导航控件的显示状态
            this.updateNovelNavControls(mode);
            
            if (mode === 'continuous') {
              this.showAllChaptersContinuous();
            } else {
              this.showNovelChapter(this.currentChapterIndex);
            }
          },

          // 更新小说导航控件状态
          updateNovelNavControls(mode) {
            const chapterSelect = document.getElementById('chapter-select');
            const prevBtn = document.getElementById('prev-chapter-btn');
            const nextBtn = document.getElementById('next-chapter-btn');
            
            if (mode === 'continuous') {
              // 连贯模式：禁用章节导航控件
              if (chapterSelect) chapterSelect.disabled = true;
              if (prevBtn) {
                prevBtn.disabled = true;
                prevBtn.style.opacity = '0.5';
              }
              if (nextBtn) {
                nextBtn.disabled = true;
                nextBtn.style.opacity = '0.5';
              }
            } else {
              // 单章节模式：启用章节导航控件
              if (chapterSelect) chapterSelect.disabled = false;
              this.updateChapterNavButtons(); // 根据当前章节更新按钮状态
            }
          },

          // 连贯显示所有章节
          showAllChaptersContinuous() {
            const body = document.getElementById('novel-mode-modal-body');
            if (!body || !this.novelChapters.length) return;

            let allContent = '';
            this.novelChapters.forEach((chapter, index) => {
              // 添加章节标题锚点，用于书签跳转
              allContent += `<div id="chapter-anchor-${index}" class="chapter-section">`;
              
              // 在连贯模式下始终显示章节标题（除了序章）
              if (chapter.title && chapter.title !== '序章') {
                allContent += `<h3 class="novel-chapter-title" style="
                  margin-top: ${index > 0 ? '3em' : '1em'};
                  margin-bottom: 1.5em;
                  border-bottom: 2px solid #8b7355;
                  padding-bottom: 0.8em;
                  color: #c9aa71;
                  font-weight: bold;
                  font-size: 18px;
                  text-align: center;
                  position: relative;
                ">${chapter.title}</h3>`;
              } else if (chapter.title === '序章') {
                // 序章也显示标题，但样式稍有不同
                allContent += `<h3 class="novel-chapter-title" style="
                  margin-top: ${index > 0 ? '2em' : '0.5em'};
                  margin-bottom: 1em;
                  border-bottom: 1px solid #8b7355;
                  padding-bottom: 0.5em;
                  color: #a0926d;
                  font-weight: normal;
                  font-size: 16px;
                  text-align: center;
                  font-style: italic;
                ">${chapter.title}</h3>`;
              }
              
              // 检查内容第一行是否重复了标题
              const contentLines = chapter.content.split('\n');
              const firstLine = contentLines[0]?.trim();
              const hasTitle = firstLine && chapter.title && firstLine.includes(chapter.title);
              
              // 如果内容第一行重复了标题，则跳过第一行
              const contentToShow = hasTitle ? contentLines.slice(1).join('\n') : chapter.content;
              
              // 添加章节内容，并在章节间增加适当间距
              allContent += `<div class="chapter-content" style="
                line-height: 1.8;
                margin-bottom: ${index < this.novelChapters.length - 1 ? '4em' : '2em'};
                text-indent: 2em;
              ">`;
              allContent += this.formatMessageContent(contentToShow);
              allContent += '</div>';
              allContent += '</div>';
            });

            body.innerHTML = `<div class="game-text-container continuous-reading" style="
              white-space: pre-wrap;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              font-size: 14px;
              line-height: 1.6;
            ">${allContent}</div>`;
            
            // 更新导航控件状态
            this.updateNovelNavControls('continuous');
          },

          // 保存显示模式
          saveNovelDisplayMode() {
            try {
              localStorage.setItem('guixu_novel_display_mode', this.novelDisplayMode);
            } catch (e) {
              console.error('保存小说显示模式失败:', e);
            }
          },

          // 加载显示模式
          loadNovelDisplayMode() {
            try {
              const saved = localStorage.getItem('guixu_novel_display_mode');
              this.novelDisplayMode = saved || 'single';
              
              // 更新UI
              const radios = document.querySelectorAll('input[name="novel-display-mode"]');
              radios.forEach(radio => {
                radio.checked = radio.value === this.novelDisplayMode;
              });
            } catch (e) {
              console.error('加载小说显示模式失败:', e);
              this.novelDisplayMode = 'single';
            }
          },

          // 小说模式背景设置
          showNovelBackgroundSettings() {
            console.log('[归墟小说背景] 打开背景设置面板');
            
            // 先加载当前设置
            this.loadNovelBackgroundSettings();
            
            // 创建小说模式专用的背景选择面板
            const existingPanel = document.getElementById('novel-background-panel');
            if (existingPanel) {
              existingPanel.remove();
            }

            const panel = document.createElement('div');
            panel.id = 'novel-background-panel';
            panel.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(15, 15, 35, 0.95);
              border: 2px solid #8b7355;
              border-radius: 8px;
              padding: 20px;
              z-index: 10001;
              min-width: 500px;
              max-width: 700px;
              max-height: 80vh;
              overflow-y: auto;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(5px);
            `;

            panel.innerHTML = `
              <div style="color: #c9aa71; font-size: 16px; font-weight: bold; margin-bottom: 15px; text-align: center;">
                小说模式背景设置
              </div>
              
              <!-- 背景开关 -->
              <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; gap: 8px; color: #c9aa71; font-size: 14px;">
                  <input type="checkbox" id="novel-bg-enabled" ${this.novelBackgroundEnabled ? 'checked' : ''}>
                  启用小说模式背景图
                </label>
              </div>
              
              <!-- 透明度设置 -->
              <div style="margin-bottom: 15px;">
                <label style="color: #c9aa71; font-size: 12px; display: block; margin-bottom: 5px;">
                  背景透明度: <span id="novel-bg-opacity-value">${this.novelBackgroundOpacity || 0.3}</span>
                </label>
                <input type="range" id="novel-bg-opacity" min="0.0" max="1.0" step="0.05" value="${this.novelBackgroundOpacity || 0.3}"
                       style="width: 100%; accent-color: #8b7355;">
              </div>
              
              <!-- 背景图选择区域 -->
              <div style="margin-bottom: 15px;">
                <label style="color: #c9aa71; font-size: 12px; display: block; margin-bottom: 10px;">选择背景图:</label>
                <div id="novel-bg-grid" style="
                  display: grid;
                  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                  gap: 10px;
                  max-height: 300px;
                  overflow-y: auto;
                  border: 1px solid #8b7355;
                  border-radius: 4px;
                  padding: 10px;
                ">
                  <!-- 背景图网格将在这里动态生成 -->
                </div>
              </div>
              
              <!-- 按钮组 -->
              <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="novel-bg-cancel" style="
                  padding: 8px 16px;
                  background: #8b7355;
                  color: #fff;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                ">关闭</button>
              </div>
            `;

            document.body.appendChild(panel);
            
            // 加载并显示可用背景图
            this.loadNovelBackgroundGrid();
            
            // 绑定事件
            this.bindNovelBackgroundPanelEvents(panel);
          },

          // 加载小说模式背景图网格
          loadNovelBackgroundGrid() {
            const grid = document.getElementById('novel-bg-grid');
            if (!grid) return;

            // 先加载背景图数据
            this.loadBackgroundSettings();

            // 清空网格
            grid.innerHTML = '';

            // 添加"无背景"选项
            const noneOption = document.createElement('div');
            noneOption.className = 'novel-bg-option';
            noneOption.dataset.bgId = '';
            noneOption.style.cssText = `
              width: 100%;
              height: 80px;
              border: 2px solid ${this.novelBackgroundImage === '' ? '#c9aa71' : '#8b7355'};
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              background: rgba(26, 26, 46, 0.8);
              color: #8b7355;
              font-size: 11px;
              transition: border-color 0.3s ease;
            `;
            noneOption.textContent = '无背景';
            noneOption.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.selectNovelBackground('');
            });
            grid.appendChild(noneOption);

            // 添加现有背景图
            if (this.backgroundImages && this.backgroundImages.length > 0) {
              this.backgroundImages.forEach(bg => {
                const option = document.createElement('div');
                option.className = 'novel-bg-option';
                option.dataset.bgId = bg.id;
                option.dataset.bgUrl = bg.dataUrl || bg.url;
                option.style.cssText = `
                  width: 100%;
                  height: 80px;
                  border: 2px solid ${this.novelBackgroundImage === (bg.dataUrl || bg.url) ? '#c9aa71' : '#8b7355'};
                  border-radius: 4px;
                  background-image: url("${bg.dataUrl || bg.url}");
                  background-size: cover;
                  background-position: center;
                  cursor: pointer;
                  position: relative;
                  transition: border-color 0.3s ease;
                `;
                
                // 添加标题覆盖层
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  background: rgba(0, 0, 0, 0.7);
                  color: #fff;
                  font-size: 10px;
                  padding: 2px 4px;
                  text-align: center;
                  border-radius: 0 0 2px 2px;
                  pointer-events: none;
                `;
                overlay.textContent = bg.name || `背景 ${bg.id}`;
                option.appendChild(overlay);
                
                option.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  this.selectNovelBackground(bg.dataUrl || bg.url);
                });
                grid.appendChild(option);
              });
            }

            // 如果没有背景图，显示提示
            if (!this.backgroundImages || this.backgroundImages.length === 0) {
              const emptyTip = document.createElement('div');
              emptyTip.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                color: #8b7355;
                font-size: 12px;
                padding: 20px;
              `;
              emptyTip.textContent = '暂无可用背景图，请先在背景设置中添加背景图';
              grid.appendChild(emptyTip);
            }
          },

          // 选择小说背景
          selectNovelBackground(bgUrl) {
            console.log('[归墟小说背景] 选择背景:', bgUrl);
            this.novelBackgroundImage = bgUrl;
            
            // 更新选中状态
            const options = document.querySelectorAll('.novel-bg-option');
            options.forEach(option => {
              const isSelected = (bgUrl === '' && option.dataset.bgId === '') ||
                               (bgUrl !== '' && option.dataset.bgUrl === bgUrl);
              option.style.borderColor = isSelected ? '#c9aa71' : '#8b7355';
              option.style.boxShadow = isSelected ? '0 0 10px rgba(201, 170, 113, 0.5)' : '';
            });
            
            // 实时响应：立即保存设置并应用背景
            this.saveNovelBackgroundSettings();
            this.applyNovelBackground();
            
            // 显示选择反馈
            this.showTemporaryMessage(`已选择背景: ${bgUrl === '' ? '无背景' : '背景图'}`);
            console.log('[归墟小说背景] 背景选择完成并已实时应用');
          },

          // 绑定小说背景面板事件
          bindNovelBackgroundPanelEvents(panel) {
            const enabledCheckbox = panel.querySelector('#novel-bg-enabled');
            const opacitySlider = panel.querySelector('#novel-bg-opacity');
            const opacityValue = panel.querySelector('#novel-bg-opacity-value');
            const cancelBtn = panel.querySelector('#novel-bg-cancel');

            // 实时响应：背景开关切换事件
            enabledCheckbox?.addEventListener('change', (e) => {
              this.novelBackgroundEnabled = e.target.checked;
              this.saveNovelBackgroundSettings();
              this.applyNovelBackground();
              console.log('[归墟小说背景] 实时切换背景开关:', this.novelBackgroundEnabled);
            });

            // 实时响应：透明度滑块事件
            opacitySlider?.addEventListener('input', (e) => {
              const value = parseFloat(e.target.value);
              opacityValue.textContent = value.toFixed(2);
              this.novelBackgroundOpacity = value;
              this.saveNovelBackgroundSettings();
              this.applyNovelBackground();
              console.log('[归墟小说背景] 实时调整透明度:', value);
            });

            // 关闭按钮
            cancelBtn?.addEventListener('click', () => {
              panel.remove();
            });
          },

          // 加载小说模式背景选项
          loadNovelBackgroundOptions() {
            try {
              const settings = JSON.parse(localStorage.getItem('guixu_background_settings') || '{}');
              const novelSettings = JSON.parse(localStorage.getItem('guixu_novel_background_settings') || '{}');
              const select = document.getElementById('novel-bg-select');
              if (!select) return;

              // 清空现有选项（保留默认选项）
              const defaultOptions = select.querySelectorAll('option[value=""], option[value="random"]');
              select.innerHTML = '';
              defaultOptions.forEach(option => select.appendChild(option));

              // 添加可用背景图
              if (settings.backgrounds && settings.backgrounds.length > 0) {
                settings.backgrounds.forEach((bg, index) => {
                  const option = document.createElement('option');
                  option.value = bg;
                  option.textContent = `背景图 ${index + 1}`;
                  select.appendChild(option);
                });
              }

              // 设置当前选中的背景
              if (novelSettings.image) {
                select.value = novelSettings.image;
              }
            } catch (e) {
              console.error('加载背景选项失败:', e);
            }
          },

          // 绑定小说背景设置事件
          bindNovelBackgroundEvents(panel) {
            const enabledCheckbox = panel.querySelector('#novel-bg-enabled');
            const opacitySlider = panel.querySelector('#novel-bg-opacity');
            const opacityValue = panel.querySelector('#novel-bg-opacity-value');
            const bgSelect = panel.querySelector('#novel-bg-select');
            const preview = panel.querySelector('#novel-bg-preview');
            const applyBtn = panel.querySelector('#novel-bg-apply');
            const cancelBtn = panel.querySelector('#novel-bg-cancel');

            // 透明度滑块事件
            opacitySlider?.addEventListener('input', (e) => {
              const value = parseFloat(e.target.value);
              opacityValue.textContent = value;
              this.updateNovelBackgroundPreview(preview, bgSelect.value, value);
            });

            // 背景选择事件
            bgSelect?.addEventListener('change', (e) => {
              this.updateNovelBackgroundPreview(preview, e.target.value, parseFloat(opacitySlider.value));
            });

            // 应用按钮
            applyBtn?.addEventListener('click', () => {
              this.novelBackgroundEnabled = enabledCheckbox.checked;
              this.novelBackgroundOpacity = parseFloat(opacitySlider.value);
              this.novelBackgroundImage = bgSelect.value;
              
              this.saveNovelBackgroundSettings();
              this.applyNovelBackground();
              
              panel.remove();
              this.showTemporaryMessage('小说背景设置已应用');
            });

            // 取消按钮
            cancelBtn?.addEventListener('click', () => {
              panel.remove();
            });

            // 初始预览
            this.updateNovelBackgroundPreview(preview, bgSelect.value, parseFloat(opacitySlider.value));
          },

          // 更新背景预览
          updateNovelBackgroundPreview(preview, bgValue, opacity) {
            if (!preview) return;

            if (!bgValue || bgValue === '') {
              preview.style.backgroundImage = '';
              preview.textContent = '无背景';
              return;
            }

            if (bgValue === 'random') {
              preview.style.backgroundImage = '';
              preview.textContent = '随机背景（应用时随机选择）';
              return;
            }

            preview.style.backgroundImage = `url(${bgValue})`;
            preview.style.opacity = opacity;
            preview.textContent = '';
          },

          // 应用小说模式背景
          applyNovelBackground() {
            const novelModal = document.getElementById('novel-mode-modal');
            if (!novelModal) return;

            console.log('[归墟小说背景] 应用背景设置:', {
              enabled: this.novelBackgroundEnabled,
              image: this.novelBackgroundImage,
              opacity: this.novelBackgroundOpacity
            });

            if (this.novelBackgroundEnabled && this.novelBackgroundImage) {
              // 应用背景图到模态框
              novelModal.style.backgroundImage = `url(${this.novelBackgroundImage})`;
              novelModal.style.backgroundSize = 'cover';
              novelModal.style.backgroundPosition = 'center';
              novelModal.style.backgroundRepeat = 'no-repeat';
              novelModal.style.backgroundAttachment = 'fixed';
              
              // 修复透明度计算 - 让背景图更清晰可见
              const opacity = this.novelBackgroundOpacity || 0.3;
              const modalContent = novelModal.querySelector('.modal-content');
              if (modalContent) {
                // 使用更合理的透明度计算，确保背景图可见
                const contentOpacity = Math.max(0.7, 1 - opacity);
                modalContent.style.backgroundColor = `rgba(15, 15, 35, ${contentOpacity})`;
                modalContent.style.backdropFilter = 'blur(1px)';
                console.log('[归墟小说背景] 设置内容透明度:', contentOpacity);
              }
              
              // 为模态框添加背景遮罩以提高可读性
              const existingOverlay = novelModal.querySelector('.novel-bg-overlay');
              if (existingOverlay) {
                existingOverlay.remove();
              }
              
              const overlay = document.createElement('div');
              overlay.className = 'novel-bg-overlay';
              overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, ${0.3 - opacity * 0.2});
                pointer-events: none;
                z-index: 1;
              `;
              novelModal.appendChild(overlay);
              
              console.log('[归墟小说背景] 背景图已应用');
            } else {
              // 移除背景
              novelModal.style.backgroundImage = '';
              novelModal.style.backgroundAttachment = '';
              const modalContent = novelModal.querySelector('.modal-content');
              if (modalContent) {
                modalContent.style.backgroundColor = '';
                modalContent.style.backdropFilter = '';
              }
              
              // 移除背景遮罩
              const existingOverlay = novelModal.querySelector('.novel-bg-overlay');
              if (existingOverlay) {
                existingOverlay.remove();
              }
              
              console.log('[归墟小说背景] 背景图已移除');
            }
          },

          // 获取随机小说背景
          getRandomNovelBackground() {
            try {
              const settings = JSON.parse(localStorage.getItem('guixu_background_settings') || '{}');
              if (settings.backgrounds && settings.backgrounds.length > 0) {
                const randomIndex = Math.floor(Math.random() * settings.backgrounds.length);
                return settings.backgrounds[randomIndex];
              }
            } catch (e) {
              console.error('获取随机背景失败:', e);
            }
            return null;
          },

          // 保存小说背景设置
          saveNovelBackgroundSettings() {
            try {
              const settings = {
                enabled: this.novelBackgroundEnabled,
                opacity: this.novelBackgroundOpacity || 0.3,
                image: this.novelBackgroundImage || ''
              };
              localStorage.setItem('guixu_novel_background_settings', JSON.stringify(settings));
            } catch (e) {
              console.error('保存小说背景设置失败:', e);
            }
          },

          // 加载小说背景设置
          loadNovelBackgroundSettings() {
            try {
              const saved = localStorage.getItem('guixu_novel_background_settings');
              if (saved) {
                const settings = JSON.parse(saved);
                this.novelBackgroundEnabled = settings.enabled || false;
                this.novelBackgroundOpacity = settings.opacity || 0.3;
                this.novelBackgroundImage = settings.image || '';
              } else {
                // 兼容旧版本设置
                const oldSaved = localStorage.getItem('guixu_novel_background_enabled');
                this.novelBackgroundEnabled = oldSaved === 'true';
                this.novelBackgroundOpacity = 0.3;
                this.novelBackgroundImage = '';
              }
            } catch (e) {
              console.error('加载小说背景设置失败:', e);
              this.novelBackgroundEnabled = false;
              this.novelBackgroundOpacity = 0.3;
              this.novelBackgroundImage = '';
            }
          },
 
           // --- 新增：自动开关世界书状态存取 ---
           saveAutoToggleState() {
             try {
               localStorage.setItem('guixu_auto_toggle_enabled', this.isAutoToggleLorebookEnabled);
             } catch (e) {
               console.error('保存自动开关状态失败:', e);
             }
           },
 
           loadAutoToggleState() {
             try {
               const savedState = localStorage.getItem('guixu_auto_toggle_enabled');
               this.isAutoToggleLorebookEnabled = savedState === 'true';
               const checkbox = document.getElementById('auto-toggle-lorebook-checkbox');
               if (checkbox) {
                 checkbox.checked = this.isAutoToggleLorebookEnabled;
               }
               // 根据加载的状态决定是否启动轮询
                if (this.isAutoToggleLorebookEnabled) {
                    this.startAutoTogglePolling();
                }
             } catch (e) {
               console.error('加载自动开关状态失败:', e);
               this.isAutoToggleLorebookEnabled = false;
             }
           },

           // --- 新增：世界书高级设置存取 ---
           saveWorldbookSettings() {
             try {
               const settings = {
                 journey: {
                   position: document.getElementById('journey-position')?.value || 'before_character_definition',
                   order: parseInt(document.getElementById('journey-order')?.value) || 17,
                   depth: parseInt(document.getElementById('journey-depth')?.value) || 1,
                   type: document.getElementById('journey-type')?.value || 'selective',
                   enabled: document.getElementById('journey-enabled')?.checked || false
                 },
                 pastLives: {
                   position: document.getElementById('past-lives-position')?.value || 'before_character_definition',
                   order: parseInt(document.getElementById('past-lives-order')?.value) || 16,
                   depth: parseInt(document.getElementById('past-lives-depth')?.value) || 1,
                   type: document.getElementById('past-lives-type')?.value || 'selective',
                   enabled: document.getElementById('past-lives-enabled')?.checked || false
                 },
                 novel: {
                   position: document.getElementById('novel-position')?.value || 'before_character_definition',
                   order: parseInt(document.getElementById('novel-order')?.value) || 18,
                   depth: parseInt(document.getElementById('novel-depth')?.value) || 1,
                   type: document.getElementById('novel-type')?.value || 'selective',
                   enabled: document.getElementById('novel-enabled')?.checked || false
                 },
                 segmented: {
                   position: document.getElementById('segmented-position')?.value || 'before_character_definition',
                   order: parseInt(document.getElementById('segmented-order')?.value) || 21,
                   depth: parseInt(document.getElementById('segmented-depth')?.value) || 1,
                   type: document.getElementById('segmented-type')?.value || 'constant',
                   enabled: document.getElementById('segmented-enabled')?.checked || false
                 },
                 largeSummary: {
                   position: document.getElementById('large-summary-position')?.value || 'before_character_definition',
                   order: parseInt(document.getElementById('large-summary-order')?.value) || 19,
                   depth: parseInt(document.getElementById('large-summary-depth')?.value) || 1,
                   type: document.getElementById('large-summary-type')?.value || 'constant',
                   enabled: document.getElementById('large-summary-enabled')?.checked || false
                 },
                 smallSummary: {
                   position: document.getElementById('small-summary-position')?.value || 'before_character_definition',
                   order: parseInt(document.getElementById('small-summary-order')?.value) || 20,
                   depth: parseInt(document.getElementById('small-summary-depth')?.value) || 1,
                   type: document.getElementById('small-summary-type')?.value || 'constant',
                   enabled: document.getElementById('small-summary-enabled')?.checked || false
                 }
               };
               
               localStorage.setItem('guixu_worldbook_settings', JSON.stringify(settings));
               this.worldbookSettings = settings;
             } catch (e) {
               console.error('保存世界书设置失败:', e);
             }
           },

           loadWorldbookSettings() {
             try {
               const savedSettings = localStorage.getItem('guixu_worldbook_settings');
               if (savedSettings) {
                 this.worldbookSettings = JSON.parse(savedSettings);
               } else {
                 // 默认设置
                 this.worldbookSettings = {
                   journey: { position: 'before_character_definition', order: 17, depth: 1, type: 'selective', enabled: false }, // 本世历程作为数据源，默认禁用
                   pastLives: { position: 'before_character_definition', order: 16, depth: 1, type: 'constant', enabled: true },
                   novel: { position: 'before_character_definition', order: 18, depth: 1, type: 'selective', enabled: false },
                   segmented: { position: 'before_character_definition', order: 21, depth: 1, type: 'constant', enabled: true },
                   largeSummary: { position: 'before_character_definition', order: 19, depth: 1, type: 'constant', enabled: true },
                   smallSummary: { position: 'before_character_definition', order: 20, depth: 1, type: 'constant', enabled: true },
                 };
               }
               
               // 更新UI
               if (document.getElementById('journey-position')) {
                 document.getElementById('journey-position').value = this.worldbookSettings.journey.position;
                 document.getElementById('journey-order').value = this.worldbookSettings.journey.order;
                 document.getElementById('journey-depth').value = this.worldbookSettings.journey.depth;
                 document.getElementById('journey-type').value = this.worldbookSettings.journey.type;
                 document.getElementById('journey-enabled').checked = this.worldbookSettings.journey.enabled;
                 
                 document.getElementById('past-lives-position').value = this.worldbookSettings.pastLives.position;
                 document.getElementById('past-lives-order').value = this.worldbookSettings.pastLives.order;
                 document.getElementById('past-lives-depth').value = this.worldbookSettings.pastLives.depth;
                 document.getElementById('past-lives-type').value = this.worldbookSettings.pastLives.type;
                 document.getElementById('past-lives-enabled').checked = this.worldbookSettings.pastLives.enabled;
                 
                 document.getElementById('novel-position').value = this.worldbookSettings.novel.position;
                 document.getElementById('novel-order').value = this.worldbookSettings.novel.order;
                 document.getElementById('novel-depth').value = this.worldbookSettings.novel.depth;
                 document.getElementById('novel-type').value = this.worldbookSettings.novel.type;
                 document.getElementById('novel-enabled').checked = this.worldbookSettings.novel.enabled;

                 if(document.getElementById('segmented-position') && this.worldbookSettings.segmented) {
                   document.getElementById('segmented-position').value = this.worldbookSettings.segmented.position;
                   document.getElementById('segmented-order').value = this.worldbookSettings.segmented.order;
                   document.getElementById('segmented-depth').value = this.worldbookSettings.segmented.depth;
                   document.getElementById('segmented-type').value = this.worldbookSettings.segmented.type;
                   document.getElementById('segmented-enabled').checked = this.worldbookSettings.segmented.enabled;
                 }

                 if(document.getElementById('large-summary-position') && this.worldbookSettings.largeSummary) {
                   document.getElementById('large-summary-position').value = this.worldbookSettings.largeSummary.position;
                   document.getElementById('large-summary-order').value = this.worldbookSettings.largeSummary.order;
                   document.getElementById('large-summary-depth').value = this.worldbookSettings.largeSummary.depth;
                   document.getElementById('large-summary-type').value = this.worldbookSettings.largeSummary.type;
                   document.getElementById('large-summary-enabled').checked = this.worldbookSettings.largeSummary.enabled;
                 }

                 if(document.getElementById('small-summary-position') && this.worldbookSettings.smallSummary) {
                   document.getElementById('small-summary-position').value = this.worldbookSettings.smallSummary.position;
                   document.getElementById('small-summary-order').value = this.worldbookSettings.smallSummary.order;
                   document.getElementById('small-summary-depth').value = this.worldbookSettings.smallSummary.depth;
                   document.getElementById('small-summary-type').value = this.worldbookSettings.smallSummary.type;
                   document.getElementById('small-summary-enabled').checked = this.worldbookSettings.smallSummary.enabled;
                 }
                 
                 // 更新深度输入框的禁用状态
                 ['journey', 'past-lives', 'novel', 'segmented', 'large-summary', 'small-summary'].forEach(type => {
                   const positionSelect = document.getElementById(`${type}-position`);
                   const depthInput = document.getElementById(`${type}-depth`);
                   if (positionSelect && depthInput) {
                     depthInput.disabled = !positionSelect.value.startsWith('at_depth');
                   }
                 });
               }
             } catch (e) {
               console.error('加载世界书设置失败:', e);
               this.worldbookSettings = {
                 journey: { position: 'before_character_definition', order: 17, depth: 1, logic: 'and_any' },
                 pastLives: { position: 'before_character_definition', order: 16, depth: 1, logic: 'and_any' },
                 novel: { position: 'before_character_definition', order: 18, depth: 1, logic: 'and_any' },
               };
             }
           },

           resetWorldbookSettings() {
             try {
               localStorage.removeItem('guixu_worldbook_settings');
               this.worldbookSettings = {
                 journey: { position: 'before_character_definition', order: 17, depth: 1, type: 'selective' },
                 pastLives: { position: 'before_character_definition', order: 16, depth: 1, type: 'constant' },
                 novel: { position: 'before_character_definition', order: 18, depth: 1, type: 'selective' },
                 segmented: { position: 'before_character_definition', order: 21, depth: 1, type: 'constant' },
                 largeSummary: { position: 'before_character_definition', order: 19, depth: 1, type: 'constant' },
                 smallSummary: { position: 'before_character_definition', order: 20, depth: 1, type: 'constant' },
               };
             } catch (e) {
               console.error('重置世界书设置失败:', e);
             }
           },

           // --- 新增：自动开关世界书轮询逻辑 (V2: 增加条目自动创建) ---
          async updateAutoToggledEntries(andDisableAll = false) {
            const bookName = '1归墟';
            const index = this.unifiedIndex;
            const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';
            const pastLivesKey = index > 1 ? `往世涟漪(${index})` : '往世涟漪';
            const segmentedKey = index > 1 ? `分段正文(${index})` : '分段正文';
            const smallSummaryKey = index > 1 ? `小总结(${index})` : '小总结';
            const largeSummaryKey = index > 1 ? `大总结(${index})` : '大总结';
            try {
                let allEntries = await TavernHelper.getLorebookEntries(bookName);
                const entriesToCreate = [];

                // --- 核心修复：检查并创建缺失的条目 ---
                const targetJourneyEntry = allEntries.find(e => e.comment === journeyKey);
                if (!targetJourneyEntry) {
                    const baseTemplate = allEntries.find(e => e.comment === '本世历程');
                    if (baseTemplate) {
                        // 最终修复V4：完整复制模板属性，确保所有必需字段都存在
                        const newJourneyEntry = { ...baseTemplate };
                        delete newJourneyEntry.uid;
                        delete newJourneyEntry.display_index;
                        newJourneyEntry.comment = journeyKey;
                        newJourneyEntry.content = '';
                        newJourneyEntry.keys = [...(baseTemplate.keys || []), journeyKey];
                        const journeySettings = this.worldbookSettings?.journey || { position: 'before_character_definition', order: 17, depth: 1, type: 'selective', enabled: false };
                        newJourneyEntry.enabled = journeySettings.enabled;
                        // 确保设置所有必需的属性，使用保存的设置
                        newJourneyEntry.type = journeySettings.type;
                        newJourneyEntry.position = journeySettings.position;
                        newJourneyEntry.order = journeySettings.order;
                        newJourneyEntry.depth = journeySettings.position.startsWith('at_depth') ? journeySettings.depth : null;
                        newJourneyEntry.scan_depth = baseTemplate.scan_depth || 'same_as_global';
                        newJourneyEntry.case_sensitive = baseTemplate.case_sensitive || 'same_as_global';
                        newJourneyEntry.match_whole_words = baseTemplate.match_whole_words || 'same_as_global';
                        newJourneyEntry.use_group_scoring = baseTemplate.use_group_scoring || 'same_as_global';
                        newJourneyEntry.probability = baseTemplate.probability !== undefined ? baseTemplate.probability : 100;
                        newJourneyEntry.exclude_recursion = baseTemplate.exclude_recursion || false;
                        newJourneyEntry.prevent_recursion = baseTemplate.prevent_recursion || false;
                        newJourneyEntry.delay_until_recursion = baseTemplate.delay_until_recursion || false;
                        entriesToCreate.push(newJourneyEntry);
                    } else {
                        // 如果没有模板，创建一个全新的条目
                        console.warn('[归墟自动开关] 未找到"本世历程"基础模板，将创建默认条目');
                        entriesToCreate.push({
                            comment: journeyKey,
                            content: '',
                            keys: [journeyKey],
                            enabled: this.worldbookSettings?.journey?.enabled || false, // 本世历程默认关闭
                            type: this.worldbookSettings?.journey?.type || 'selective',
                            position: this.worldbookSettings?.journey?.position || 'before_character_definition',
                            order: this.worldbookSettings?.journey?.order || 17,
                            depth: (this.worldbookSettings?.journey?.position || '').startsWith('at_depth') ? (this.worldbookSettings?.journey?.depth || 1) : null,
                            scan_depth: 'same_as_global',
                            case_sensitive: 'same_as_global',
                            match_whole_words: 'same_as_global',
                            use_group_scoring: 'same_as_global',
                            probability: 100,
                            exclude_recursion: false,
                            prevent_recursion: false,
                            delay_until_recursion: false,
                            filters: [],
                            depth: null,
                            automation_id: null,
                            group: '',
                            group_prioritized: false,
                            group_weight: 100,
                            sticky: null,
                            cooldown: null,
                            delay: null
                        });
                    }
                }

                const targetPastLivesEntry = allEntries.find(e => e.comment === pastLivesKey);
                if (!targetPastLivesEntry) {
                    const baseTemplate = allEntries.find(e => e.comment === '往世涟漪');
                    if (baseTemplate) {
                        // 最终修复V4：完整复制模板属性，确保所有必需字段都存在
                        const newPastLivesEntry = { ...baseTemplate };
                        delete newPastLivesEntry.uid;
                        delete newPastLivesEntry.display_index;
                        newPastLivesEntry.comment = pastLivesKey;
                        newPastLivesEntry.content = '';
                        newPastLivesEntry.keys = [...(baseTemplate.keys || []), pastLivesKey];
                        const pastLivesSettings = this.worldbookSettings?.pastLives || { position: 'before_character_definition', order: 16, depth: 1, type: 'selective', enabled: true };
                        newPastLivesEntry.enabled = pastLivesSettings.enabled;
                        // 确保设置所有必需的属性，使用保存的设置
                        newPastLivesEntry.type = pastLivesSettings.type;
                        newPastLivesEntry.position = pastLivesSettings.position;
                        newPastLivesEntry.order = pastLivesSettings.order;
                        newPastLivesEntry.depth = pastLivesSettings.position.startsWith('at_depth') ? pastLivesSettings.depth : null;
                        newPastLivesEntry.scan_depth = baseTemplate.scan_depth || 'same_as_global';
                        newPastLivesEntry.case_sensitive = baseTemplate.case_sensitive || 'same_as_global';
                        newPastLivesEntry.match_whole_words = baseTemplate.match_whole_words || 'same_as_global';
                        newPastLivesEntry.use_group_scoring = baseTemplate.use_group_scoring || 'same_as_global';
                        newPastLivesEntry.probability = baseTemplate.probability !== undefined ? baseTemplate.probability : 100;
                        newPastLivesEntry.exclude_recursion = baseTemplate.exclude_recursion || false;
                        newPastLivesEntry.prevent_recursion = baseTemplate.prevent_recursion || false;
                        newPastLivesEntry.delay_until_recursion = baseTemplate.delay_until_recursion || false;
                        entriesToCreate.push(newPastLivesEntry);
                    } else {
                        // 如果没有模板，创建一个全新的条目
                        console.warn('[归墟自动开关] 未找到"往世涟漪"基础模板，将创建默认条目');
                        entriesToCreate.push({
                            comment: pastLivesKey,
                            content: '',
                            keys: [pastLivesKey],
                            enabled: this.worldbookSettings?.pastLives?.enabled || true,
                            type: this.worldbookSettings?.pastLives?.type || 'selective',
                            position: this.worldbookSettings?.pastLives?.position || 'before_character_definition',
                            order: this.worldbookSettings?.pastLives?.order || 16,
                            depth: (this.worldbookSettings?.pastLives?.position || '').startsWith('at_depth') ? (this.worldbookSettings?.pastLives?.depth || 1) : null,
                            scan_depth: 'same_as_global',
                            case_sensitive: 'same_as_global',
                            match_whole_words: 'same_as_global',
                            use_group_scoring: 'same_as_global',
                            probability: 100,
                            exclude_recursion: false,
                            prevent_recursion: false,
                            delay_until_recursion: false,
                            filters: [],
                            automation_id: null,
                            group: '',
                            group_prioritized: false,
                            group_weight: 100,
                            sticky: null,
                            cooldown: null,
                            delay: null
                        });
                    }
                }

               const targetSegmentedEntry = allEntries.find(e => e.comment === segmentedKey);
               if (!targetSegmentedEntry) {
                   const baseTemplate = allEntries.find(e => e.comment === '分段正文');
                   const segmentedSettings = this.worldbookSettings?.segmented || { position: 'before_character_definition', order: 21, depth: 1, type: 'constant' };
                   
                   let newEntry;
                   if (baseTemplate) {
                       newEntry = { ...baseTemplate };
                       delete newEntry.uid;
                       delete newEntry.display_index;
                   } else {
                       newEntry = {
                           keys: [],
                           scan_depth: 'same_as_global',
                           case_sensitive: 'same_as_global',
                           match_whole_words: 'same_as_global',
                           use_group_scoring: 'same_as_global',
                           probability: 100,
                           exclude_recursion: false,
                           prevent_recursion: false,
                           delay_until_recursion: false,
                           filters: [],
                           automation_id: null,
                           group: '',
                           group_prioritized: false,
                           group_weight: 100,
                           sticky: null,
                           cooldown: null,
                           delay: null
                       };
                   }

                   Object.assign(newEntry, {
                       comment: segmentedKey,
                       content: '等待自动生成...',
                       enabled: segmentedSettings.enabled,
                       type: segmentedSettings.type,
                       position: segmentedSettings.position,
                       order: segmentedSettings.order,
                       depth: segmentedSettings.position.startsWith('at_depth') ? segmentedSettings.depth : null,
                   });

                   entriesToCreate.push(newEntry);
               }

                // 新增：检查并创建小总结
                const targetSmallSummaryEntry = allEntries.find(e => e.comment === smallSummaryKey);
                if (!targetSmallSummaryEntry) {
                    const baseTemplate = allEntries.find(e => e.comment === '小总结');
                    const smallSummarySettings = this.worldbookSettings?.smallSummary || { position: 'before_character_definition', order: 20, depth: 1, type: 'constant' };
                    let newEntry;
                    if (baseTemplate) {
                        newEntry = { ...baseTemplate };
                        delete newEntry.uid;
                        delete newEntry.display_index;
                    } else {
                        newEntry = { keys: [], scan_depth: 'same_as_global', case_sensitive: 'same_as_global', match_whole_words: 'same_as_global', use_group_scoring: 'same_as_global', probability: 100, exclude_recursion: false, prevent_recursion: false, delay_until_recursion: false, filters: [], automation_id: null, group: '', group_prioritized: false, group_weight: 100, sticky: null, cooldown: null, delay: null };
                    }
                    Object.assign(newEntry, {
                        comment: smallSummaryKey,
                        content: '等待自动生成...',
                        enabled: smallSummarySettings.enabled,
                        type: smallSummarySettings.type,
                        position: smallSummarySettings.position,
                        order: smallSummarySettings.order,
                        depth: smallSummarySettings.position.startsWith('at_depth') ? smallSummarySettings.depth : null,
                    });
                    entriesToCreate.push(newEntry);
                }

                // 新增：检查并创建大总结
                const targetLargeSummaryEntry = allEntries.find(e => e.comment === largeSummaryKey);
                if (!targetLargeSummaryEntry) {
                    const baseTemplate = allEntries.find(e => e.comment === '大总结');
                    const largeSummarySettings = this.worldbookSettings?.largeSummary || { position: 'before_character_definition', order: 19, depth: 1, type: 'constant' };
                    let newEntry;
                    if (baseTemplate) {
                        newEntry = { ...baseTemplate };
                        delete newEntry.uid;
                        delete newEntry.display_index;
                    } else {
                        newEntry = { keys: [], scan_depth: 'same_as_global', case_sensitive: 'same_as_global', match_whole_words: 'same_as_global', use_group_scoring: 'same_as_global', probability: 100, exclude_recursion: false, prevent_recursion: false, delay_until_recursion: false, filters: [], automation_id: null, group: '', group_prioritized: false, group_weight: 100, sticky: null, cooldown: null, delay: null };
                    }
                    Object.assign(newEntry, {
                        comment: largeSummaryKey,
                        content: '等待自动生成...',
                        enabled: largeSummarySettings.enabled,
                        type: largeSummarySettings.type,
                        position: largeSummarySettings.position,
                        order: largeSummarySettings.order,
                        depth: largeSummarySettings.position.startsWith('at_depth') ? largeSummarySettings.depth : null,
                    });
                    entriesToCreate.push(newEntry);
                }

                if (entriesToCreate.length > 0) {
                    await TavernHelper.createLorebookEntries(bookName, entriesToCreate);
                    console.log(`[归墟自动开关] 已自动创建 ${entriesToCreate.length} 个新世界书条目。`);
                    // 重新获取所有条目，以包含新创建的条目
                    allEntries = await TavernHelper.getLorebookEntries(bookName);
                }
                // --- 修复结束 ---

                const entriesToUpdate = allEntries
                    .filter(entry => entry.comment.startsWith('本世历程') || entry.comment.startsWith('往世涟漪') || entry.comment.startsWith('分段正文') || entry.comment.startsWith('小总结') || entry.comment.startsWith('大总结') || entry.comment.startsWith('小说模式'))
                    .map(entry => {
                        let shouldBeEnabled;
                        if (andDisableAll) {
                            shouldBeEnabled = false;
                        } else {
                            // 根据comment key从settings中找到对应的配置决定是否启用
                            if (entry.comment === journeyKey) shouldBeEnabled = this.worldbookSettings.journey.enabled;
                            else if (entry.comment === pastLivesKey) shouldBeEnabled = this.worldbookSettings.pastLives.enabled;
                            else if (entry.comment === segmentedKey) shouldBeEnabled = this.worldbookSettings.segmented.enabled;
                            else if (entry.comment === smallSummaryKey) shouldBeEnabled = this.worldbookSettings.smallSummary.enabled;
                            else if (entry.comment === largeSummaryKey) shouldBeEnabled = this.worldbookSettings.largeSummary.enabled;
                            else if (entry.comment === (index > 1 ? `小说模式(${index})` : '小说模式')) shouldBeEnabled = this.worldbookSettings.novel.enabled;
                            else shouldBeEnabled = false; // 默认不启用未知条目
                        }

                        // 只在状态需要改变时才加入更新队列
                        if (entry.enabled !== shouldBeEnabled) {
                            return { uid: entry.uid, enabled: shouldBeEnabled };
                        }
                        return null;
                    }).filter(Boolean); // 过滤掉null的项

                if (entriesToUpdate.length > 0) {
                    await TavernHelper.setLorebookEntries(bookName, entriesToUpdate);
                    console.log(`[归墟自动开关] 更新了 ${entriesToUpdate.length} 个世界书条目状态。`);
                }
            } catch (error) {
                console.error('[归墟自动开关] 更新世界书条目状态时出错:', error);
            }
          },

          startAutoTogglePolling() {
              this.stopAutoTogglePolling(false); // 先停止任何可能存在的旧轮询, 但不禁用条目
              console.log('[归墟] 启动世界书自动开关轮询...');
              this.updateAutoToggledEntries(); // 立即执行一次
              this.autoToggleIntervalId = setInterval(() => this.updateAutoToggledEntries(), 5000); // 每5秒轮询一次
          },

          stopAutoTogglePolling(disableEntries = true) {
              if (this.autoToggleIntervalId) {
                  console.log('[归墟] 停止世界书自动开关轮询。');
                  clearInterval(this.autoToggleIntervalId);
                  this.autoToggleIntervalId = null;
              }
              if (disableEntries) {
                  // 停止时，确保所有相关条目都被禁用
                  this.updateAutoToggledEntries(true);
              }
          },

           // --- Misc ---
           applyRandomBackground() {
             const container = document.querySelector('.guixu-root-container');
             if (!container) {
               console.warn('[归墟背景] 找不到根容器，无法应用背景图');
               return;
             }

             console.log('[归墟背景] 应用背景图，模式:', this.backgroundMode, '图片数量:', this.backgroundImages.length);

             // 如果用户有自定义背景图，则使用用户的设置
             if (this.backgroundImages.length > 0) {
               let backgroundToApply;
               
               if (this.backgroundMode === 'fixed' && this.selectedBackgroundId) {
                 // 固定模式：使用选中的背景图
                 backgroundToApply = this.backgroundImages.find(bg => bg.id === this.selectedBackgroundId);
                 if (!backgroundToApply) {
                   console.warn('[归墟背景] 找不到选中的背景图，ID:', this.selectedBackgroundId, '切换到随机模式');
                   backgroundToApply = this.backgroundImages[Math.floor(Math.random() * this.backgroundImages.length)];
                 }
               } else if (this.backgroundMode === 'random') {
                 // 随机模式：从用户背景图中随机选择
                 backgroundToApply = this.backgroundImages[Math.floor(Math.random() * this.backgroundImages.length)];
               }

               if (backgroundToApply && backgroundToApply.dataUrl) {
                 // 检查是否为Object URL（以blob:开头）
                 const isObjectUrl = backgroundToApply.dataUrl.startsWith('blob:');
                 // 检查是否为外链图片
                 const isUrlImage = backgroundToApply.isUrlImage;
                 
                 if (isObjectUrl) {
                   console.log(`[归墟背景] 使用Object URL背景: ${backgroundToApply.name}`);
                   // 对于Object URL，需要验证其有效性
                   const img = new Image();
                   img.onload = () => {
                     container.style.backgroundImage = `url('${backgroundToApply.dataUrl}')`;
                     console.log(`[归墟背景] 成功应用Object URL背景: ${backgroundToApply.name}`);
                   };
                   img.onerror = () => {
                     console.error(`[归墟背景] Object URL背景无效: ${backgroundToApply.name}`);
                     this.handleInvalidBackground(backgroundToApply);
                   };
                   img.src = backgroundToApply.dataUrl;
                 } else if (isUrlImage) {
                   console.log(`[归墟背景] 使用外链图片背景: ${backgroundToApply.name}`);
                   // 对于外链图片，需要验证其有效性
                   const img = new Image();
                   img.onload = () => {
                     container.style.backgroundImage = `url('${backgroundToApply.dataUrl}')`;
                     console.log(`[归墟背景] 成功应用外链背景: ${backgroundToApply.name}`);
                   };
                   img.onerror = () => {
                     console.error(`[归墟背景] 外链背景无效或无法访问: ${backgroundToApply.name}`);
                     this.handleInvalidBackground(backgroundToApply);
                   };
                   // 设置跨域属性
                   img.crossOrigin = 'anonymous';
                   img.src = backgroundToApply.dataUrl;
                 } else {
                   // 普通DataURL，直接应用
                   container.style.backgroundImage = `url('${backgroundToApply.dataUrl}')`;
                   console.log(`[归墟背景] 应用背景: ${backgroundToApply.name} (${this.backgroundMode}模式)`);
                 }
                 return;
               }
             }

             // 如果没有用户背景图，使用默认背景
             console.log('[归墟背景] 使用默认背景图');
             const defaultBackgrounds = [
               'https://i.postimg.cc/ZqvGBxxF/rgthree-compare-temp-hxqke-00004.png',
               'https://i.postimg.cc/fRP4RrmR/rgthree-compare-temp-hxqke-00002.png',
             ];
             const bgUrl = defaultBackgrounds[Math.floor(Math.random() * defaultBackgrounds.length)];
             container.style.backgroundImage = `url('${bgUrl}')`;
           },

           // 新增：处理无效背景的函数
           handleInvalidBackground(invalidBackground) {
             const bgType = invalidBackground.isUrlImage ? '外链图片' :
                           invalidBackground.dataUrl.startsWith('blob:') ? 'Object URL图片' : '本地图片';
             console.warn(`[归墟背景] 处理无效背景: ${invalidBackground.name} (${bgType})`);
             
             // 显示用户友好的提示信息
             if (invalidBackground.isUrlImage) {
               this.showTemporaryMessage(`外链图片"${invalidBackground.name}"无法访问，已自动移除`, 4000);
             }
             
             // 从背景列表中移除无效背景
             const index = this.backgroundImages.findIndex(bg => bg.id === invalidBackground.id);
             if (index !== -1) {
               this.backgroundImages.splice(index, 1);
               this.saveBackgroundSettings();
               console.log(`[归墟背景] 已移除无效背景: ${invalidBackground.name}`);
               
               // 如果删除的是当前选中的背景，清除选择
               if (this.selectedBackgroundId === invalidBackground.id) {
                 this.selectedBackgroundId = null;
                 this.backgroundMode = 'random'; // 切换到随机模式
                 this.saveBackgroundSettings();
               }
               
               // 如果还有其他背景，尝试应用一个新的
               if (this.backgroundImages.length > 0) {
                 this.applyRandomBackground();
               } else {
                 // 没有背景了，使用默认背景
                 console.log('[归墟背景] 所有用户背景已清除，使用默认背景');
                 const container = document.querySelector('.guixu-root-container');
                 if (container) {
                   const defaultBackgrounds = [
                     'https://i.postimg.cc/ZqvGBxxF/rgthree-compare-temp-hxqke-00004.png',
                     'https://i.postimg.cc/fRP4RrmR/rgthree-compare-temp-hxqke-00002.png',
                   ];
                   const bgUrl = defaultBackgrounds[Math.floor(Math.random() * defaultBackgrounds.length)];
                   container.style.backgroundImage = `url('${bgUrl}')`;
                 }
               }
               
               // 刷新背景列表显示
               if (document.getElementById('background-settings-modal') &&
                   document.getElementById('background-settings-modal').style.display === 'flex') {
                 this.renderBackgroundList();
                 this.updateBackgroundModeUI(); // 更新模式UI
               }
             }
           },

          // 初始化背景图系统
          initBackgroundSystem() {
            console.log('[归墟背景] 初始化背景图系统...');
            
            // 首先加载背景图设置
            this.loadBackgroundSettings();
            console.log('[归墟背景] 已加载背景图设置，当前图片数量:', this.backgroundImages.length);
            
            // 加载透明度设置
            this.loadOpacitySettings();
            console.log('[归墟透明度] 已加载透明度设置，当前透明度:', this.mainOpacity + '%');

            // 文字设置已在主初始化函数中加载，此处不再重复调用

            // 清理过期的字体缓存
            this.cleanupExpiredFontCache();
            
            // 如果没有用户背景图，添加预设背景图
            if (this.backgroundImages.length === 0) {
              console.log('[归墟背景] 没有用户背景图，添加预设背景图');
              this.backgroundImages = [
                {
                  id: 'preset1',
                  name: '仙境云海',
                  dataUrl: 'https://i.postimg.cc/ZqvGBxxF/rgthree-compare-temp-hxqke-00004.png',
                  isPreset: true
                },
                {
                  id: 'preset2',
                  name: '古风山水',
                  dataUrl: 'https://i.postimg.cc/fRP4RrmR/rgthree-compare-temp-hxqke-00002.png',
                  isPreset: true
                }
              ];
              this.saveBackgroundSettings();
              console.log('[归墟背景] 预设背景图已添加并保存');
            }
            
            // 应用背景图
            this.applyRandomBackground();
            
            console.log('[归墟背景] 背景图系统初始化完成');
          },

          async executeQuickSend() {
            const input = document.getElementById('quick-send-input');
            if (!input) return;
            const userMessage = input.value.trim();

            if (userMessage) {
                this.saveInputToHistory(userMessage); // 发送时保存到历史
            }

            await this.handleAction(userMessage);
          },

          // 新增：处理所有动作的核心函数

          async handleAction(userMessage = '') {
  
            this.lastUserMessage = userMessage; // 修复：记录用户输入以计算梦尘
            const gameTextDisplay = document.getElementById('game-text-display');
              if (gameTextDisplay) {
                  this.lastValidGametxtHTML = gameTextDisplay.innerHTML;
              }
              const thinkingDisplay = document.getElementById('thinking-content-display');
              if (thinkingDisplay) {
                  thinkingDisplay.style.display = 'none';
              }
              this.lastExtractedThinking = null;
              this.saveLastThinking(); // 清除持久化存储
              this.updateThinkingButtonVisibility();
              document.getElementById('action-options-container').innerHTML = ''; // 隐藏行动选项
              this.hideVariableChangesReminder(); // 隐藏变量改变提醒
              this.isStreamingGametxt = false; // 重置流式状态
              // 1. 整合输入
              let commandText = '';
              if (this.pendingActions.length > 0) {
                  // 新增：整合所有变量更新指令
                  let variableUpdates = [];
                  this.pendingActions.forEach(cmd => {
                      if (cmd.action === 'variable_update') {
                          variableUpdates.push(cmd.command);
                      }
                  });

                  if (variableUpdates.length > 0) {
                      commandText += '<UpdateVariable>\n' + variableUpdates.join('\n') + '\n</UpdateVariable>\n';
                  }

                  commandText += '[本轮行动指令]\n';
                  this.pendingActions.forEach(cmd => {
                     let actionText = '';
                      // 修复：优先处理无action的纯命令指令
                      if (!cmd.action && cmd.command) {
                          actionText = cmd.command;
                      } else {
                        switch (cmd.action) {
                            case 'equip': actionText = `装备 [${cmd.itemName}] 到 [${cmd.category}] 槽位。`; break;
                            case 'unequip': actionText = `卸下 [${cmd.itemName}] 从 [${cmd.category}] 槽位。`; break;
                            case 'use': actionText = `使用 ${cmd.quantity} 个 [${cmd.itemName}]。`; break;
                            case 'discard':
                              if (cmd.quantity && cmd.quantity > 1) {
                                actionText = `丢弃 ${cmd.quantity} 个 [${cmd.itemName}]。`;
                              } else {
                                actionText = `丢弃 [${cmd.itemName}]。`;
                              }
                              break;
                           case 'send_as_is':
                               actionText = cmd.command;
                               break;
                       case 'join_world':
                         switch (cmd.poolType) {
                             case 'character':
                                  this.pendingCompanionJoin = { id: cmd.itemData.id, name: cmd.itemData.名称, rarity: cmd.itemData.稀有度 };
                                  this.pendingCharacterCardGeneration = cmd.itemData.名称;
                                  // 为角色生成详细的模板指令
                                  actionText = `
[指令]
一位新的伙伴即将到来。请完成以下任务：
1.  **【剧情扮演】**：在 <gametxt> 标签中，自然地描写祂的到来，以及与“我”的初次互动。
2.  **【角色卡生成】**：为了让这个角色更加丰满，请你基于祂的“角色基础信息”，并严格仿照下方“角色卡模板范例”的【深度、细节和风格】，为新角色创作一份独特的角色设定。请将完整的角色卡包裹在 <CharacterCard>...</CharacterCard> 标签内。
---
### **角色基础信息 (为新角色创作的依据):**
* 姓名：${cmd.itemData.名称}
* 稀有度：${cmd.itemData.稀有度 || '未知'}
* 系列：${cmd.itemData.系列 || '未知'}
* 描述：${cmd.itemData.描述 || '暂无'}
---
### **角色卡模板范例 (创作时需要模仿的风格和细节):**
<CharacterCard>
{
    "称呼": "${cmd.itemData.名称}",
    "tier": "[AI生成-例如: 金丹]",
    "等级": "[AI生成-例如: 中期]",
    "relationship": "[AI生成-例如: 盟友]",
    "favorability": "[AI生成-例如: 60]",
    "身份背景": "[AI生成-例如: 来自某个隐世宗门的真传弟子，为历练红尘下山。]",
    "性格": "[AI生成-例如: 外表清冷，不苟言语，但内心善良，有自己的行事准则。]",
    "外貌": "[AI生成-例如: 一袭白衣，身背古剑，面容俊朗，眼神锐利如鹰。]",
    "attributes": {"法力": "[AI生成]", "神海": "[AI生成]", "道心": "[AI生成]", "空速": "[AI生成]", "气运": "[AI生成]"},
    "主修功法": {"name": "[AI生成]", "tier": "[AI生成]", "description": "[AI生成]"},
    "event_history": {"初见": "[AI生成-例如: 在万妖古林中，因争夺灵药与主角相识。]"}
}
</CharacterCard>
`;
                                  break;
                              case 'item':
                                  // 为道具生成简单的系统提示
                                  actionText = `[系统提示] “我”通过衍梦尘获得了名为【${cmd.itemName}】的道具。描述：${cmd.itemData.描述}`;
                                  break;
                              case 'talent':
                                  // 为天赋生成简单的系统提示
                                  actionText = `[系统提示] “我”通过衍梦尘获得了名为【${cmd.itemName}】的天赋。描述：${cmd.itemData.描述}`;
                                  break;
               // 新增的case
                    case 'acquire_item_talent':
                        actionText = `[系统提示] “我”通过衍梦尘获得了名为【${cmd.itemName}】的${cmd.itemData.类型}。描述：${cmd.itemData.描述}`;
                        break;
             }
                          break;
                            case 'travel': // 新增
                               actionText = `前往地点：[${cmd.locationName}]`;
                               break;
                            case 'do_action': // 新增
                               actionText = `选择行动：${cmd.text}`;
                               break;
                        }
                      }
                      if (actionText) {
                        commandText += `- ${actionText}\n`;
                      }
                  });
              }

              if (!userMessage && !commandText) {
                  this.showTemporaryMessage('请输入回复或添加指令后发送。');
                  return;
              }

              // 2. 构建 GenerateConfig 对象
              const generateConfig = {
                  injects: [],
                  should_stream: this.isStreamingEnabled, // 修改：使用状态变量
              };

              // 将用户输入和指令合并为一个 user-role 注入
              let combinedContent = '';
              if (commandText) {
                  combinedContent += commandText + '\n'; // 指令在前
              }
              if (userMessage) {
                  combinedContent += `<行动选择>\n${userMessage}\n</行动选择>`;
              }

              if (combinedContent) {
                  generateConfig.injects.push({
                      role: 'user',
                      content: combinedContent,
                      position: 'in_chat', // 插入到聊天记录中
                      depth: 0,
                      should_scan: true, // 允许扫描关键字
                  });
              }

              this.lastSentPrompt = combinedContent; // 更新调试信息
              
              // 新增：控制台发送内容报告
              console.group('🚀 [归墟] 本次发送内容报告');
              console.log('📤 发送时间:', new Date().toLocaleString('zh-CN'));
              console.log('🎯 流式模式:', this.isStreamingEnabled ? '开启' : '关闭');
              
              if (commandText) {
                  console.log('⚡ 指令内容:');
                  console.log(commandText);
              }
              
              if (userMessage) {
                  console.log('💬 用户输入:');
                  console.log(userMessage);
              }
              
              console.log('📋 完整发送内容:');
              console.log(combinedContent);
              
              console.log('🔧 GenerateConfig:');
              console.log(generateConfig);
              console.groupEnd();
              
              this.showWaitingMessage();

              try {
                  // 3. 调用 generate，它现在不会立即返回最终结果
                  await TavernHelper.generate(generateConfig);
                  // 后续处理已移至 handleStreamEnd
              } catch (error) {
                  console.error('处理动作时出错:', error);
                  this.showTemporaryMessage(`和伟大梦星沟通失败: ${error.message}`);
                  this.hideWaitingMessage(); // 确保隐藏等待消息
              }
           },
 
           async handleMapUpdateCommand(commandContent) {
               console.log('[归墟地图] 检测到地图更新指令:', commandContent);
               // this.showTemporaryMessage('正在更新玄昊界地图...', 2000); // 用户要求静默处理
 
               const bookName = '1归墟';
               const mapEntryKey = '地图';
 
               try {
                   // 1. 读取当前地图数据
                   const allEntries = await TavernHelper.getLorebookEntries(bookName);
                   const mapEntry = allEntries.find(entry => entry.comment === mapEntryKey);
                   if (!mapEntry) {
                       throw new Error(`在世界书 "${bookName}" 中未找到名为 "${mapEntryKey}" 的条目。`);
                   }
                   
                   let currentLocations = this.parseMapData(mapEntry.content || '');
                   let modified = false;

                   // 2. 使用正则表达式解析所有指令
                   const updateRegex = /<更新>([\s\S]*?)<\/更新>/g;
                   const addRegex = /<新增>([\s\S]*?)<\/新增>/g;
                   const deleteRegex = /<删除>([\s\S]*?)<\/删除>/g;
                   let match;

                   // 处理所有删除指令
                   while ((match = deleteRegex.exec(commandContent)) !== null) {
                       const namesToDelete = match[1].trim().replace(/[\[\]]/g, '').split(',').map(name => name.trim());
                       const initialLength = currentLocations.length;
                       currentLocations = currentLocations.filter(loc => !namesToDelete.includes(loc.name));
                       if(currentLocations.length < initialLength) modified = true;
                       console.log('[归墟地图] 已删除:', namesToDelete);
                   }
                   
                   // 处理所有更新指令
                   while ((match = updateRegex.exec(commandContent)) !== null) {
                       const updates = this.parseMapData(match[1].trim());
                       updates.forEach(update => {
                           const index = currentLocations.findIndex(loc => loc.name === update.name);
                           if (index !== -1) {
                               Object.assign(currentLocations[index], update);
                               modified = true;
                               console.log('[归墟地图] 已更新:', update);
                           }
                       });
                   }

                   // 处理所有新增指令
                   while ((match = addRegex.exec(commandContent)) !== null) {
                       const newLocations = this.parseMapData(match[1].trim());
                       newLocations.forEach(newLoc => {
                           if (newLoc.name && !currentLocations.some(loc => loc.name === newLoc.name)) {
                               currentLocations.push(newLoc);
                               modified = true;
                               console.log('[归墟地图] 已新增:', newLoc);
                           }
                       });
                   }
                   
                   // 3. 仅当数据有变化时才写回
                   if (modified) {
                       const newContent = currentLocations.map(loc => {
                           const parts = [`${loc.name}`];
                           // 保证坐标在前
                           if(loc.x !== undefined) parts.push(`x:${loc.x}`);
                           if(loc.y !== undefined) parts.push(`y:${loc.y}`);
                           if(loc.z !== undefined) parts.push(`z:${loc.z}`);
                           for (const [key, value] of Object.entries(loc)) {
                                if (key !== 'name' && key !== 'x' && key !== 'y' && key !== 'z' && value !== undefined) {
                                    parts.push(`${key}:${value}`);
                                }
                           }
                           return `[${parts.join('|')}]`;
                       }).join('\n');
 
                       // 4. 写回世界书
                       await TavernHelper.setLorebookEntries(bookName, [{ uid: mapEntry.uid, content: newContent }]);
                       // this.showTemporaryMessage('地图已更新！'); // 用户要求静默处理
 
                       // 5. 如果地图是打开的，则刷新它
                       if (document.getElementById('map-modal').style.display === 'flex') {
                           const stat_data = this.currentMvuState?.stat_data;
                           const playerPos = stat_data ? this.SafeGetValue(stat_data, '当前位置', null) : null;
                           this.renderMap(document.getElementById('map-modal-body'), currentLocations, playerPos);
                       }
                   } else {
                       console.log('[归墟地图] 地图数据无变化，跳过写入。');
                   }
 
               } catch (error) {
                   console.error('处理地图更新指令时出错:', error);
                   // this.showTemporaryMessage(`地图更新失败: ${error.message}`); // 用户要求静默处理
               }
           },
 
           // --- 新增：地图交互事件处理 ---
            bindMapEvents(container) {
                // 事件直接绑定在最外层容器上，但操作的是内层 map-container
                const mapContainer = container.querySelector('.map-container');
                if (!mapContainer) return;

                // 使用 .bind(this) 确保函数内的 this 指向 GuixuManager
                const handleWheel = this.handleMapWheel.bind(this);
                const handleMouseDown = this.handleMapMouseDown.bind(this);
                const handleMouseMove = this.handleMapMouseMove.bind(this);
                const handleMouseUp = this.handleMapMouseUp.bind(this);
                const handleMouseLeave = this.handleMapMouseLeave.bind(this);

                container.addEventListener('wheel', handleWheel, { passive: false });
                container.addEventListener('mousedown', handleMouseDown);
                container.addEventListener('mousemove', handleMouseMove);
                container.addEventListener('mouseup', handleMouseUp);
                container.addEventListener('mouseleave',handleMouseLeave);

                // --- 新增：为触屏设备添加事件监听 ---
                const handleTouchStart = this.handleMapTouchStart.bind(this);
                const handleTouchMove = this.handleMapTouchMove.bind(this);
                const handleTouchEnd = this.handleMapTouchEnd.bind(this);
                container.addEventListener('touchstart', handleTouchStart, { passive: false });
                container.addEventListener('touchmove', handleTouchMove, { passive: false });
                container.addEventListener('touchend', handleTouchEnd);
                container.addEventListener('touchcancel', handleTouchEnd);


                // 新增：为缩放滑块绑定事件
                const zoomSlider = document.getElementById('zoom-slider');
                if (zoomSlider) {
                    zoomSlider.addEventListener('input', this.handleZoomSlider.bind(this));
                }

               // 新增：为“回到玩家”按钮绑定事件
               const centerBtn = document.getElementById('btn-center-player');
               if (centerBtn) {
                   centerBtn.addEventListener('click', this.centerOnPlayer.bind(this));
               }
            },

            updateMapTransform() {
                const mapContainer = document.querySelector('#map-modal-body .map-container');
                if (mapContainer) {
                    // 混合方案：拖动用 left/top，缩放用 transform。
                    // left/top 用于高频的拖动事件，避免 transform 导致的闪烁。
                    // scale 用于缩放。此函数现在是所有变换的唯一来源。
                    mapContainer.style.left = `${this.mapState.panX}px`;
                    mapContainer.style.top = `${this.mapState.panY}px`;
                    mapContainer.style.transform = `scale(${this.mapState.scale})`;
                }
            },
           
            resetMapState() {
                this.mapState = { scale: 1, panX: 0, panY: 0, isPanning: false, startX: 0, startY: 0, animationFrameId: null };
                this.updateMapTransform();
                this.updateZoomSliderUI();
            },

            handleMapWheel(event) {
                event.preventDefault();
                const scaleAmount = 0.1;
                const { clientX, clientY } = event;
                const containerRect = event.currentTarget.getBoundingClientRect();
                
                const mouseX = clientX - containerRect.left;
                const mouseY = clientY - containerRect.top;

                const oldScale = this.mapState.scale;
                const newScale = event.deltaY > 0
                    ? Math.max(0.05, oldScale - scaleAmount)
                    : Math.min(5, oldScale + scaleAmount);

                // 计算缩放中心，并调整panX和panY，使其在视觉上以鼠标为中心缩放
                this.mapState.panX = mouseX - (mouseX - this.mapState.panX) * (newScale / oldScale);
                this.mapState.panY = mouseY - (mouseY - this.mapState.panY) * (newScale / oldScale);
                this.mapState.scale = newScale;

                this.updateMapTransform();
                this.updateZoomSliderUI(); // 同步滑块UI
            },

            handleMapMouseDown(event) {
                event.preventDefault();
                this.mapState.isPanning = true;
                this.mapState.startX = event.clientX - this.mapState.panX;
                this.mapState.startY = event.clientY - this.mapState.panY;
            },

            handleMapMouseMove(event) {
                // 无论是否在拖动，都更新坐标显示
                this.updateCursorCoords(event);

                if (this.mapState.isPanning) {
                    event.preventDefault();
                    this.mapState.panX = event.clientX - this.mapState.startX;
                    this.mapState.panY = event.clientY - this.mapState.startY;
                    // 使用 requestAnimationFrame 优化拖动性能，防止屏闪
                    if (!this.mapState.animationFrameId) {
                        this.mapState.animationFrameId = requestAnimationFrame(() => {
                            this.updateMapTransform();
                            this.mapState.animationFrameId = null; // 重置ID，允许下一次请求
                        });
                    }
                }
            },

            handleMapMouseUp(event) {
                this.mapState.isPanning = false;
                // 停止拖动时，取消任何挂起的动画帧，以防止不必要的一次性更新
                if (this.mapState.animationFrameId) {
                   cancelAnimationFrame(this.mapState.animationFrameId);
                   this.mapState.animationFrameId = null;
                }
            },
            
            handleMapMouseLeave(event) {
              // 鼠标离开时，清除坐标显示
              this.updateCursorCoords(event, true);

                this.mapState.isPanning = false;
                if (this.mapState.animationFrameId) {
                   cancelAnimationFrame(this.mapState.animationFrameId);
                   this.mapState.animationFrameId = null;
                }
            },

           // --- 新增：触屏事件处理函数 ---
           handleMapTouchStart(event) {
               if (event.touches.length === 1) { // 只处理单指拖动
                   event.preventDefault();
                   const touch = event.touches[0];
                   this.mapState.isPanning = true;
                   this.mapState.startX = touch.clientX - this.mapState.panX;
                   this.mapState.startY = touch.clientY - this.mapState.panY;
               }
           },

           handleMapTouchMove(event) {
               if (this.mapState.isPanning && event.touches.length === 1) {
                   event.preventDefault();
                   const touch = event.touches[0];
                   this.mapState.panX = touch.clientX - this.mapState.startX;
                   this.mapState.panY = touch.clientY - this.mapState.startY;

                   if (!this.mapState.animationFrameId) {
                       this.mapState.animationFrameId = requestAnimationFrame(() => {
                           this.updateMapTransform();
                           this.mapState.animationFrameId = null;
                       });
                   }
               }
           },

           handleMapTouchEnd(event) {
               this.mapState.isPanning = false;
               if (this.mapState.animationFrameId) {
                   cancelAnimationFrame(this.mapState.animationFrameId);
                   this.mapState.animationFrameId = null;
               }
           },

            updateZoomSliderUI() {
                const slider = document.getElementById('zoom-slider');
                const display = document.getElementById('zoom-level-display');
                if (slider && display) {
                    slider.value = this.mapState.scale;
                    display.textContent = `${Math.round(this.mapState.scale * 100)}%`;
                }
            },

            handleZoomSlider(event) {
                const newScale = parseFloat(event.target.value);
                if (!isNaN(newScale)) {
                    // 当通过滑块缩放时，以视图中心为缩放点
                    const containerRect = document.querySelector('#map-modal-body').getBoundingClientRect();
                    const centerX = containerRect.width / 2;
                    const centerY = containerRect.height / 2;
                    const oldScale = this.mapState.scale;
                    
                    this.mapState.panX = centerX - (centerX - this.mapState.panX) * (newScale / oldScale);
                    this.mapState.panY = centerY - (centerY - this.mapState.panY) * (newScale / oldScale);
                    this.mapState.scale = newScale;

                    this.updateMapTransform();
                    this.updateZoomSliderUI(); // 仅更新百分比显示
                }
            },

            // --- 新增：地图坐标和居中功能 ---
            updateCursorCoords(event, clear = false) {
               const display = document.getElementById('cursor-coords-display');
               if (!display) return;

               if (clear) {
                   display.textContent = 'x: ---, y: ---';
                   return;
               }

               const container = document.querySelector('#map-modal-body');
               const containerRect = container.getBoundingClientRect();
               const scale = this.mapState.scale;
               const panX = this.mapState.panX;
               const panY = this.mapState.panY;

               // 1. 鼠标在视口（map-modal-body）内的坐标
               const mouseX = event.clientX - containerRect.left;
               const mouseY = event.clientY - containerRect.top;

               // 2. 逆向计算鼠标在缩放前、平移前的位置
               const mapMouseX = (mouseX - panX) / scale;
               const mapMouseY = (mouseY - panY) / scale;

               // 3. 逆向计算相对于地图中心 (50%, 50%) 的偏移量
               const mapContainer = container.querySelector('.map-container');
               const mapRect = mapContainer.getBoundingClientRect();
               const mapCenterX = mapRect.width / 2;
               const mapCenterY = mapRect.height / 2;

               const offsetX = mapMouseX - mapCenterX;
               const offsetY = mapMouseY - mapCenterY;

               // 4. 将像素偏移量转换回世界坐标
               const SCALE_FACTOR = 100; // 与renderMap中保持一致
               const worldX = Math.round(offsetX * SCALE_FACTOR);
               const worldY = Math.round(offsetY * SCALE_FACTOR);

               display.textContent = `x: ${worldX}, y: ${worldY}`;
            },

            centerOnPlayer() {
               if (!this.mapState.playerMapPos) {
                   this.showTemporaryMessage("未找到玩家当前位置。");
                   return;
               }

               const container = document.querySelector('#map-modal-body');
               const containerRect = container.getBoundingClientRect();
               const targetScale = 1.0; // 回到100%缩放

               // 目标：将 this.mapState.playerMapPos (玩家像素坐标) 移动到视口中心
               const targetX = containerRect.width / 2;
               const targetY = containerRect.height / 2;

               // 计算需要的 panX 和 panY
               // panX = targetX - (playerX * scale)
               // panY = targetY - (playerY * scale)
               this.mapState.scale = targetScale;
               this.mapState.panX = targetX - (this.mapState.playerMapPos.x * targetScale);
               this.mapState.panY = targetY - (this.mapState.playerMapPos.y * targetScale);

               this.updateMapTransform();
               this.updateZoomSliderUI();
               this.showTemporaryMessage("已回到当前位置");
            },

            addTravelAction(location) {
               if (!location || !location.name) return;
               
               // 添加到指令队列
               this.pendingActions.push({
                   action: 'travel',
                   locationName: location.name,
               });

               this.savePendingActions();
               this.showTemporaryMessage(`已将 [前往 ${location.name}] 加入指令中心`);
               this.closeAllModals(); // 关闭地图，返回主界面
            },

           // --- 新增：快速指令列表相关函数 ---
           toggleQuickCommands() {
             const popup = document.getElementById('quick-command-popup');
            if (!popup) return;

            if (popup.style.display === 'block') {
              this.hideQuickCommands();
            } else {
              this.showQuickCommands();
            }
          },

      // 统一的指令文本格式化函数 (v3 - 修复语法错误)
          _formatActionText(cmd) {
              if (!cmd) return '';
              let actionText = '';
              switch (cmd.action) {
                  case 'equip': actionText = `[装备] ${cmd.itemName} 到 ${cmd.category}`; break;
                  case 'unequip': actionText = `[卸下] ${cmd.itemName} 从 ${cmd.category}`; break;
                  case 'use': actionText = `[使用] ${cmd.itemName} x ${cmd.quantity}`; break;
                  case 'discard': actionText = `[丢弃] ${cmd.quantity ? cmd.quantity + ' 个 ' : ''}${cmd.itemName}`; break;
                  case 'join_world': actionText = `[加入世界] 角色: ${cmd.itemName}`; break;
                  case 'acquire_item_talent':
                      const type = cmd.itemData && cmd.itemData.类型 ? cmd.itemData.类型 : '物品';
                      actionText = `[获得] ${type}: ${cmd.itemName}`;
                      break;
                  case 'travel': actionText = `[前往] 地点: ${cmd.locationName}`; break;
                  case 'do_action': actionText = `[行动] ${cmd.text}`; break;
                  case 'variable_update': actionText = cmd.text; break;
                  case 'send_as_is': actionText = cmd.text; break; // 新增：处理归墟空间购买指令
              }

              if (!actionText) {
                  actionText = `[未知指令] ${cmd.action || '无类型'}`;
              }
              return actionText;
          },
    showQuickCommands() {
              const popup = document.getElementById('quick-command-popup');
              if (!popup) return;
              if (this.pendingActions.length === 0) {
                  popup.innerHTML = '<div class="quick-command-empty">暂无待执行的指令</div>';
              } else {
                  let listHtml = '<ul class="quick-command-list">';
                  this.pendingActions.forEach(cmd => {
                      const actionText = this._formatActionText(cmd); // 核心修复：调用统一的格式化函数
                      if (actionText) {
                          listHtml += `<li class="quick-command-item">${actionText}</li>`;
                      }
                  });
                  listHtml += '</ul>';
                  popup.innerHTML = listHtml;
              }
              popup.style.display = 'block';
          },

          hideQuickCommands() {
            const popup = document.getElementById('quick-command-popup');
            if (popup) {
              popup.style.display = 'none';
            }
          },

          // --- 数据结构修复函数：防止重复嵌套 ---
          _fixNestedStructure(obj, path = '', visited = new Set()) {
              if (!obj || typeof obj !== 'object') return obj;
              
              // 防止无限递归
              const objKey = `${path}:${JSON.stringify(obj)}`;
              if (visited.has(objKey)) {
                  console.warn(`[归墟-结构修复] 检测到循环引用，跳过路径: ${path}`);
                  return obj;
              }
              visited.add(objKey);
              
              // 特别处理人物关系列表的重复嵌套问题
              if (path === '人物关系列表' || path.endsWith('.人物关系列表')) {
                  return this._fixRelationshipNesting(obj, path, visited);
              }
              
              // 递归处理对象的所有属性
              if (_.isObject(obj) && !Array.isArray(obj)) {
                  const fixed = {};
                  for (const [key, value] of Object.entries(obj)) {
                      const newPath = path ? `${path}.${key}` : key;
                      fixed[key] = this._fixNestedStructure(value, newPath, visited);
                  }
                  return fixed;
              }
              
              // 递归处理数组
              if (Array.isArray(obj)) {
                  return obj.map((item, index) => {
                      const newPath = `${path}[${index}]`;
                      return this._fixNestedStructure(item, newPath, visited);
                  });
              }
              
              return obj;
          },

          // --- 专门修复人物关系列表嵌套问题 ---
          _fixRelationshipNesting(relationships, path, visited) {
              if (!relationships || typeof relationships !== 'object') return relationships;
              
              const fixed = {};
              
              for (const [personName, personData] of Object.entries(relationships)) {
                  if (!personData || typeof personData !== 'object') {
                      fixed[personName] = personData;
                      continue;
                  }
                  
                  // 检查是否存在重复的人物关系列表嵌套
                  if (personData.人物关系列表) {
                      console.warn(`[归墟-结构修复] 检测到人物 ${personName} 存在重复的人物关系列表嵌套，正在修复...`);
                      
                      // 移除嵌套的人物关系列表，保留其他属性
                      const cleanedPersonData = { ...personData };
                      delete cleanedPersonData.人物关系列表;
                      fixed[personName] = cleanedPersonData;
                  } else {
                      // 递归处理人物数据的其他属性
                      const cleanedPersonData = {};
                      for (const [key, value] of Object.entries(personData)) {
                          const newPath = `${path}.${personName}.${key}`;
                          cleanedPersonData[key] = this._fixNestedStructure(value, newPath, visited);
                      }
                      fixed[personName] = cleanedPersonData;
                  }
              }
              
              return fixed;
          },

          // --- 深度检测和修复MVU状态数据 ---
          _deepFixMvuState(mvuState) {
              if (!mvuState || typeof mvuState !== 'object') {
                  return mvuState;
              }

              console.log('[归墟-深度修复] 开始深度修复MVU状态数据...');
              
              try {
                  // 使用现有的结构修复函数，增加深度限制
                  const fixedState = this._fixNestedStructure(mvuState, '', new Set());
                  console.log('[归墟-深度修复] MVU状态数据修复完成');
                  return fixedState;
              } catch (error) {
                  console.error('[归墟-深度修复] 修复过程中出现错误:', error);
                  return mvuState; // 返回原始数据
              }
          },

          // --- 安全的数据加载和修复 ---
          _safeLoadMvuData(rawData) {
              if (!rawData) return null;
              
              try {
                  // 首先进行深度修复
                  const fixedData = this._deepFixMvuState(rawData);
                  
                  // 验证关键数据结构
                  if (fixedData && fixedData.stat_data) {
                      console.log('[归墟-安全加载] MVU数据加载和修复成功');
                      return fixedData;
                  } else {
                      console.warn('[归墟-安全加载] 修复后的数据缺少关键结构');
                      return rawData;
                  }
              } catch (error) {
                  console.error('[归墟-安全加载] 数据加载修复失败:', error);
                  return rawData;
              }
          },

          // --- 核心重构：前端备用MVU处理器（已修复嵌套问题）---
          // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
          _applyUpdateFallback(script, currentMvuState) {
              if (!script || !currentMvuState) return null;
              
              const newState = _.cloneDeep(currentMvuState);
              let modified = false;

              const commands = this._extractCommands(script);

              for (const command of commands) {
                  try {
                      const path = this._trimQuotes(command.args[0]);
                      
                      switch (command.command) {
                          case 'set': {
                              const newValueStr = command.args.length >= 2 ? command.args[1] : undefined;
                              if(newValueStr === undefined) continue;
                              let newValue = this._parseCommandValue(newValueStr);
                              
                              if (newValue instanceof Date) newValue = newValue.toISOString();

                              _.set(newState.stat_data, path, newValue);
                              modified = true;
                              break;
                          }
                          case 'add': {
                              const value = _.get(newState.stat_data, path);
                              const delta = this._parseCommandValue(command.args[1]);
                              if (typeof value === 'number' && typeof delta === 'number') {
                                  _.set(newState.stat_data, path, value + delta);
                                  modified = true;
                              }
                              break;
                          }
                          case 'remove': {
                              _.unset(newState.stat_data, path);
                              modified = true;
                              break;
                          }
                          case 'assign':
                          case 'insert': {
                              if (command.args.length === 2) {
                                  // Handles _.assign('path', value)
                                  const valueToAssign = this._parseCommandValue(command.args[1]);
                                  const parentCollection = _.get(newState.stat_data, path);

                                  // Special handling for our [data_array, "description"] structure
                                  if (Array.isArray(parentCollection) && parentCollection.length === 2 && Array.isArray(parentCollection[0]) && typeof parentCollection[1] === 'string') {
                                      const innerArray = parentCollection[0];
                                      const description = parentCollection[1];
                                      const newInnerArray = innerArray.concat(Array.isArray(valueToAssign) ? valueToAssign : [valueToAssign]);
                                      const newParentArray = [newInnerArray, description];
                                      _.set(newState.stat_data, path, newParentArray);
                                      modified = true;
                                  } else if (Array.isArray(parentCollection)) {
                                      // Standard immutable update for regular arrays
                                      const newCollection = parentCollection.concat(Array.isArray(valueToAssign) ? valueToAssign : [valueToAssign]);
                                      _.set(newState.stat_data, path, newCollection);
                                      modified = true;
                                  } else if (_.isObject(parentCollection)) {
                                      // 修复：使用安全的对象合并，避免重复嵌套
                                      const safeValueToAssign = this._sanitizeAssignValue(valueToAssign, path);
                                      const mergedObject = this._safeMergeObjects(parentCollection, safeValueToAssign, path);
                                      _.set(newState.stat_data, path, mergedObject);
                                      modified = true;
                                  } else {
                                      // If path doesn't exist, just set it
                                      _.set(newState.stat_data, path, valueToAssign);
                                      modified = true;
                                  }
                              } else if (command.args.length >= 3) {
                                  // Handles _.assign('path', key, value)
                                  const keyOrIndex = this._parseCommandValue(command.args[1]);
                                  const valueToAssign = this._parseCommandValue(command.args[2]);
                                  let collection = _.get(newState.stat_data, path);

                                  if (Array.isArray(collection)) {
                                      if (typeof keyOrIndex === 'number') {
                                          const newCollection = [...collection]; // Create a shallow copy for immutability
                                          newCollection.splice(keyOrIndex, 0, valueToAssign);
                                          _.set(newState.stat_data, path, newCollection);
                                          modified = true;
                                      }
                                  } else if (_.isObject(collection)) {
                                      // 修复：使用安全的键值设置，避免重复嵌套
                                      const safeValue = this._sanitizeAssignValue(valueToAssign, `${path}.${keyOrIndex}`);
                                      _.set(collection, String(keyOrIndex), safeValue);
                                      modified = true;
                                  } else {
                                      // If collection doesn't exist, create it
                                      const newCollection = {};
                                      const safeValue = this._sanitizeAssignValue(valueToAssign, `${path}.${keyOrIndex}`);
                                      _.set(newCollection, String(keyOrIndex), safeValue);
                                      _.set(newState.stat_data, path, newCollection);
                                      modified = true;
                                  }
                              }
                              break;
                          }
                      }
                  } catch (e) {
                      console.error(`[归墟-备用方案] 处理指令失败:`, command, e);
                  }
              }

              // 修复：在返回前对整个数据结构进行清理
              if (modified && newState.stat_data) {
                  console.log('[归墟-备用方案] 正在修复数据结构嵌套问题...');
                  newState.stat_data = this._fixNestedStructure(newState.stat_data);
              }

              return modified ? newState : null;
          },

          // --- 安全的赋值值清理函数 ---
          _sanitizeAssignValue(value, targetPath) {
              if (!value || typeof value !== 'object') return value;
              
              // 特别处理人物关系列表相关的赋值
              if (targetPath.includes('人物关系列表')) {
                  // 如果要赋值的对象本身包含人物关系列表，移除它以防止嵌套
                  if (_.isObject(value) && value.人物关系列表) {
                      console.warn(`[归墟-数据清理] 移除赋值对象中的重复人物关系列表: ${targetPath}`);
                      const cleaned = { ...value };
                      delete cleaned.人物关系列表;
                      return cleaned;
                  }
              }
              
              return value;
          },

          // --- 安全的对象合并函数 ---
          _safeMergeObjects(target, source, path) {
              if (!_.isObject(target) || !_.isObject(source)) {
                  return source; // 如果不是对象，直接返回源值
              }
              
              const result = _.cloneDeep(target);
              
              // 特别处理人物关系列表的合并
              if (path === '人物关系列表' || path.endsWith('.人物关系列表')) {
                  // 对于人物关系列表，我们只合并不存在的键，避免重复嵌套
                  for (const [key, value] of Object.entries(source)) {
                      if (!result[key]) {
                          result[key] = this._sanitizeAssignValue(value, `${path}.${key}`);
                      } else {
                          // 如果人物已存在，只更新不存在的属性
                          if (_.isObject(result[key]) && _.isObject(value)) {
                              for (const [subKey, subValue] of Object.entries(value)) {
                                  if (subKey !== '人物关系列表') { // 永远不合并嵌套的人物关系列表
                                      result[key][subKey] = subValue;
                                  }
                              }
                          }
                      }
                  }
                  return result;
              }
              
              // 对于其他对象，使用标准合并但避免循环引用
              return _.mergeWith(result, source, (objValue, srcValue, key) => {
                  // 防止合并同名的嵌套结构
                  if (key === path.split('.').pop()) {
                      console.warn(`[归墟-安全合并] 跳过同名键的合并以防止嵌套: ${key}`);
                      return objValue; // 保持原值，不合并
                  }
                  return undefined; // 使用默认合并行为
              });
          },

          // --- 内部辅助函数，从 function.ts 移植 ---
          _trimQuotes(str) {
              if (typeof str !== 'string') return str;
              return str.replace(/^['"` ]*(.*?)['"` ]*$/, '$1');
          },
          
          _parseCommandValue(valStr) {
              if (typeof valStr !== 'string') return valStr;
              const trimmed = valStr.trim();
              if (trimmed === 'true') return true;
              if (trimmed === 'false') return false;
              if (trimmed === 'null') return null;
              if (trimmed === 'undefined') return undefined;
              try {
                  return JSON.parse(trimmed);
              } catch (e) {
                  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                      try {
                          return new Function(`return ${trimmed};`)();
                      } catch (err) { /* continue */ }
                  }
              }
              return this._trimQuotes(valStr);
          },

          _extractCommands(inputText) {
              const results = [];
              let i = 0;
              while (i < inputText.length) {
                  const match = inputText.substring(i).match(/_\.(set|assign|remove|add|insert)\(/);
                  if (!match || match.index === undefined) break;
                  
                  const commandType = match[1];
                  const start = i + match.index;
                  const openParen = start + match[0].length;
                  const closeParen = this._findMatchingCloseParen(inputText, openParen);
                  
                  if (closeParen === -1) {
                      i = openParen;
                      continue;
                  }
                  
                  let endPos = closeParen + 1;
                  if (endPos >= inputText.length || inputText[endPos] !== ';') {
                      i = closeParen + 1;
                      continue;
                  }
                  endPos++;
                  
                  const paramsString = inputText.substring(openParen, closeParen);
                  const params = this._parseParameters(paramsString);
                  
                  results.push({ command: commandType, args: params });
                  i = endPos;
              }
              return results;
          },

          _findMatchingCloseParen(str, startPos) {
              let parenCount = 1;
              let inQuote = false;
              let quoteChar = '';
              for (let i = startPos; i < str.length; i++) {
                  const char = str[i];
                  if ((char === '"' || char === "'" || char === '`') && str[i - 1] !== '\\') {
                      if (!inQuote) {
                          inQuote = true;
                          quoteChar = char;
                      } else if (char === quoteChar) {
                          inQuote = false;
                      }
                  }
                  if (!inQuote) {
                      if (char === '(') parenCount++;
                      else if (char === ')') {
                          parenCount--;
                          if (parenCount === 0) return i;
                      }
                  }
              }
              return -1;
          },

          _parseParameters(paramsString) {
              const params = [];
              let currentParam = '';
              let inQuote = false;
              let quoteChar = '';
              let bracketCount = 0;
              let braceCount = 0;
              let parenCount = 0;
              for (let i = 0; i < paramsString.length; i++) {
                  const char = paramsString[i];
                  if ((char === '"' || char === "'" || char === '`') && (i === 0 || paramsString[i - 1] !== '\\')) {
                      if (!inQuote) {
                          inQuote = true;
                          quoteChar = char;
                      } else if (char === quoteChar) {
                          inQuote = false;
                      }
                  }
                  if (!inQuote) {
                      if (char === '(') parenCount++;
                      if (char === ')') parenCount--;
                      if (char === '[') bracketCount++;
                      if (char === ']') bracketCount--;
                      if (char === '{') braceCount++;
                      if (char === '}') braceCount--;
                  }
                  if (char === ',' && !inQuote && parenCount === 0 && bracketCount === 0 && braceCount === 0) {
                      params.push(currentParam.trim());
                      currentParam = '';
                      continue;
                  }
                  currentParam += char;
              }
              if (currentParam.trim()) {
                  params.push(currentParam.trim());
              }
              return params;
          },

          // --- 新增：HTML转义辅助函数 ---
          escapeHtml(text) {
            if (typeof text !== 'string') return text;
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          },

          // --- 新增：文本净化辅助函数 ---
          _getDisplayText(aiResponse) {
            try {
              if (!aiResponse || typeof aiResponse !== 'string') return '';
              
              // 优先提取 <gametxt> 的内容
              const gameText = this._extractLastTagContent('gametxt', aiResponse);
              if (gameText !== null) {
                  // 新增：移除HTML注释，修复因注释导致的存档逻辑崩溃问题
                  return gameText.replace(new RegExp('<!--[\\s\\S]*?-->', 'g'), '').trim();
              }

              // 修复：如果找不到 <gametxt>，则直接返回原始响应，避免备用方案错误地破坏其他HTML标签。
              // 染色的逻辑完全交给 formatMessageContent 处理。
              return aiResponse.trim();
            } catch (e) {
              console.error("解析显示文本时出错:", e, "原始输入:", aiResponse);
              return "[摘要解析失败]";
            }
          },

          // --- 新增：可重用的、健壮的标签提取函数 ---
           _extractLastTagContent(tagName, text, ignoreCase = false) {
               if (!text || typeof text !== 'string') return null;

               const flags = ignoreCase ? 'gi' : 'g';
               const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, flags);
               
               const matches = [...text.matchAll(regex)];
               
               if (matches.length > 0) {
                   // 返回最后一个匹配项的内容
                   return matches[matches.length - 1][1].trim();
               }

               return null;
           },

           // --- 新增：MVU语法解析和中文转义 ---
           parseMvuCommands(mvuText) {
               if (!mvuText || typeof mvuText !== 'string') return [];
               
               const changes = [];
               const lines = mvuText.split('\n');
               
               for (const line of lines) {
                   const trimmedLine = line.trim();
                   if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('<') || trimmedLine.startsWith('</')) {
                       continue;
                   }
                   
                   // 解析 _.set 命令 (支持2参数和3参数格式)
                   let setMatch = trimmedLine.match(/^_\.set\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,)]+)(?:\s*,\s*([^)]+))?\)\s*;?\s*(?:\/\/(.*))?$/);
                   if (setMatch) {
                       const [, path, param2, param3, comment] = setMatch;
                       let oldValue, newValue;
                       
                       if (param3 !== undefined) {
                           // 三参数格式: _.set(path, oldValue, newValue)
                           oldValue = this.formatValue(param2);
                           newValue = this.formatValue(param3);
                       } else {
                           // 二参数格式: _.set(path, newValue)
                           oldValue = '未知';
                           newValue = this.formatValue(param2);
                       }
                       
                       changes.push({
                           type: 'set',
                           path: this.translatePath(path),
                           oldValue: oldValue,
                           newValue: newValue,
                           comment: comment ? comment.trim() : '',
                           description: oldValue !== '未知' ?
                               `设置 ${this.translatePath(path)} 从 ${oldValue} 变为 ${newValue}` :
                               `设置 ${this.translatePath(path)} 为 ${newValue}`
                       });
                       continue;
                   }
                   
                   // 解析 _.add 命令
                   const addMatch = trimmedLine.match(/^_\.add\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)\s*;?\s*(?:\/\/(.*))?$/);
                   if (addMatch) {
                       const [, path, delta, comment] = addMatch;
                       const deltaValue = this.formatValue(delta);
                       changes.push({
                           type: 'add',
                           path: this.translatePath(path),
                           delta: deltaValue,
                           comment: comment ? comment.trim() : '',
                           description: `${this.translatePath(path)} 增加 ${deltaValue}`
                       });
                       continue;
                   }
                   
                   // 解析 _.assign 命令 (支持2参数和3参数格式)
                   const assignMatch = trimmedLine.match(/^_\.assign\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,)]+)(?:\s*,\s*([^)]+))?\)\s*;?\s*(?:\/\/(.*))?$/);
                   if (assignMatch) {
                       const [, path, param2, param3, comment] = assignMatch;
                       let key, value, description;
                       
                       if (param3 !== undefined) {
                           // 三参数格式: _.assign(path, key, value)
                           key = this.formatValue(param2);
                           value = this.formatValue(param3);
                           description = `向 ${this.translatePath(path)} 添加 ${key}: ${value}`;
                       } else {
                           // 二参数格式: _.assign(path, value) 或 _.assign(path, key)
                           const formattedValue = this.formatValue(param2);
                           
                           // 尝试判断是否为对象格式
                           if (param2.trim().startsWith('{') || param2.trim().startsWith('[')) {
                               description = `向 ${this.translatePath(path)} 添加复杂对象`;
                               key = '对象';
                               value = formattedValue;
                           } else {
                               // 简单值，可能是数组元素或对象键
                               key = formattedValue;
                               value = '';
                               description = `向 ${this.translatePath(path)} 添加 ${formattedValue}`;
                           }
                       }
                       
                       changes.push({
                           type: 'assign',
                           path: this.translatePath(path),
                           key: key,
                           value: value,
                           comment: comment ? comment.trim() : '',
                           description: description
                       });
                       continue;
                   }
                   
                   // 解析 _.remove 命令
                   const removeMatch = trimmedLine.match(/^_\.remove\s*\(\s*['"`]([^'"`]+)['"`](?:\s*,\s*([^)]+))?\)\s*;?\s*(?:\/\/(.*))?$/);
                   if (removeMatch) {
                       const [, path, target, comment] = removeMatch;
                       const targetValue = target ? this.formatValue(target) : '';
                       changes.push({
                           type: 'remove',
                           path: this.translatePath(path),
                           target: targetValue,
                           comment: comment ? comment.trim() : '',
                           description: `从 ${this.translatePath(path)} 移除${targetValue ? ' ' + targetValue : '内容'}`
                       });
                       continue;
                   }
               }
               
               return changes;
           },

           // 路径翻译：将英文路径转换为中文描述
           translatePath(path) {
               const translations = {
                   '当前境界': '当前境界',
                   '境界映射': '境界映射',
                   '修为进度': '修为进度',
                   '修为瓶颈': '修为瓶颈',
                   '法力': '法力上限',
                   '当前法力': '当前法力',
                   '神海': '神海上限',
                   '当前神海': '当前神海',
                   '道心': '道心上限',
                   '当前道心': '当前道心',
                   '空速': '空速上限',
                   '当前空速': '当前空速',
                   '气运': '气运',
                   '生理年龄': '生理年龄',
                   '心理年龄': '心理年龄',
                   '当前时间纪年': '当前时间',
                   '归墟充能时间': '归墟充能',
                   '天赋列表': '天赋',
                   '灵根列表': '灵根',
                   '武器列表': '武器',
                   '防具列表': '防具',
                   '饰品列表': '饰品',
                   '法宝列表': '法宝',
                   '丹药列表': '丹药',
                   '其他列表': '其他物品',
                   '人物关系列表': '人物关系',
                   '当前状态': '状态效果',
                   '当前位置': '当前位置'
               };
               
               // 处理数组索引 [0] 等
               let translatedPath = path.replace(/\[0\]/g, '');
               
               // 逐段翻译路径
               const segments = translatedPath.split('.');
               const translatedSegments = segments.map(segment => {
                   return translations[segment] || segment;
               });
               
               return translatedSegments.join(' → ');
           },

           // 格式化数值显示
           formatValue(value) {
               if (typeof value === 'string') {
                   // 移除引号
                   const cleaned = value.replace(/^['"`]|['"`]$/g, '');
                   return cleaned;
               }
               return String(value);
           },

           // --- 新增：变量改变提醒功能 ---
           updateVariableChangesReminder() {
               if (!this.lastExtractedVariables) {
                   this.hideVariableChangesReminder();
                   return;
               }

               const changes = this.parseMvuCommands(this.lastExtractedVariables);
               if (changes.length === 0) {
                   this.hideVariableChangesReminder();
                   return;
               }

               this.showVariableChangesReminder(changes);
           },

           showVariableChangesReminder(changes) {
               const reminder = document.getElementById('variable-changes-reminder');
               const count = document.getElementById('variable-changes-count');
               const content = document.getElementById('variable-changes-content');

               if (!reminder || !count || !content) return;

               // 更新计数
               count.textContent = changes.length;

               // 生成变量改变内容
               const changesHtml = changes.map(change => {
                   const typeText = {
                       'set': '设置',
                       'add': '增加',
                       'assign': '添加',
                       'remove': '移除'
                   }[change.type] || change.type;

                   return `
                       <div class="variable-change-item">
                           <div class="variable-change-description">
                               <span class="variable-change-type ${change.type}">${typeText}</span>
                               ${change.description}
                           </div>
                           ${change.comment ? `<div class="variable-change-comment">${change.comment}</div>` : ''}
                       </div>
                   `;
               }).join('');

               content.innerHTML = changesHtml;
               reminder.style.display = 'block';
           },

           hideVariableChangesReminder() {
               const reminder = document.getElementById('variable-changes-reminder');
               if (reminder) {
                   reminder.style.display = 'none';
               }
           },

           toggleVariableChanges() {
               const content = document.getElementById('variable-changes-content');
               const icon = document.getElementById('variable-changes-icon');

               if (!content || !icon) return;

               const isExpanded = content.classList.contains('expanded');
               
               if (isExpanded) {
                   content.classList.remove('expanded');
                   icon.classList.add('collapsed');
                   icon.textContent = '▶';
               } else {
                   content.classList.add('expanded');
                   icon.classList.remove('collapsed');
                   icon.textContent = '▼';
               }
           },

             // --- 新增：思维过程显示/隐藏 ---
             toggleThinkingDisplay() {
                const content = document.getElementById('thinking-process-content');
                const icon = document.getElementById('thinking-process-icon');

                if (!content || !icon) return;

                const isExpanded = content.classList.contains('expanded');

                if (isExpanded) {
                    content.classList.remove('expanded');
                    icon.classList.add('collapsed');
                    icon.textContent = '▶';
                } else {
                    if (this.lastExtractedThinking) {
                        try {
                            if (typeof formatAsDisplayedMessage === 'function') {
                                const cleanedContent = this.lastExtractedThinking
                                    .replace(/<thinking>/g, '')
                                    .replace(/<\/thinking>/g, '');
                                content.innerHTML = formatAsDisplayedMessage(cleanedContent);
                            } else {
                                content.innerHTML = this.simpleMarkdownParse(this.lastExtractedThinking);
                            }
                        } catch (error) {
                            console.error('Error formatting thinking content:', error);
                            content.textContent = this.lastExtractedThinking;
                        }
                        content.classList.add('expanded');
                        icon.classList.remove('collapsed');
                        icon.textContent = '▼';
                    }
                }
            },
            updateThinkingButtonVisibility() {
                const container = document.getElementById('thinking-process-container');
                if (container) {
                    if (this.lastExtractedThinking && this.lastExtractedThinking.trim() !== '') {
                        container.style.display = 'block';
                    } else {
                        container.style.display = 'none';
                    }
                }
            },
            // --- 新增：思维过程持久化 ---
            saveLastThinking() {
                try {
                    if (this.lastExtractedThinking) {
                        localStorage.setItem('guixu_last_thinking', this.lastExtractedThinking);
                    } else {
                        localStorage.removeItem('guixu_last_thinking');
                    }
                } catch (e) {
                    console.error('保存思维过程失败:', e);
                }
            },

            loadLastThinking() {
                try {
                    this.lastExtractedThinking = localStorage.getItem('guixu_last_thinking') || null;
                } catch (e) {
                    console.error('加载思维过程失败:', e);
                    this.lastExtractedThinking = null;
                }
            },

           // --- 新增：多存档管理功能 ---
          showSaveLoadManager() {
            this.openModal('save-load-modal');
            const manualContainer = document.getElementById('save-slots-container');
            const autoContainer = document.getElementById('auto-save-slot-container');
            if (!manualContainer || !autoContainer) return;

            let saves;
            try {
                saves = this.getSavesFromStorage();
            } catch (e) {
                console.error("解析整个存档文件失败，可能是JSON格式错误:", e);
                manualContainer.innerHTML = `<div style="color: #ff6b6b; padding: 20px; text-align: center;"><p>错误：主存档文件已损坏。</p></div>`;
                autoContainer.innerHTML = '';
                return;
            }

            // 1. 渲染自动存档槽位 (五缓冲)
            let autoSaveHtml = '';
            const autoSaveSlots = [
                { id: 'auto_save_slot_0', name: '自动存档-1 (最新)', color: '#66CDAA' },
                { id: 'auto_save_slot_1', name: '自动存档-2', color: '#FFD700' },
                { id: 'auto_save_slot_2', name: '自动存档-3', color: '#87CEEB' },
                { id: 'auto_save_slot_3', name: '自动存档-4', color: '#FFA07A' },
                { id: 'auto_save_slot_4', name: '自动存档-5 (最旧)', color: '#D3D3D3' }
            ];

            autoSaveSlots.forEach((slotInfo, index) => {
                const autoSaveData = saves[slotInfo.id];
                autoSaveHtml += `<div class="save-slot" data-slot-id="${slotInfo.id}">`;
                if (autoSaveData && autoSaveData.mvu_data) {
                    const date = new Date(autoSaveData.timestamp).toLocaleString('zh-CN');
                    const statDataForRender = autoSaveData.mvu_data.stat_data || (autoSaveData.mvu_data['当前境界'] ? autoSaveData.mvu_data : null);
                    const jingjie = this.SafeGetValue(statDataForRender, '当前境界', '未知');
                    const jinian = this.SafeGetValue(statDataForRender, '当前时间纪年', '未知');
                    const summary = this._getDisplayText(autoSaveData.message_content);
                    const displayName = autoSaveData.save_name || slotInfo.name;
                    
                    autoSaveHtml += `
                        <div class="save-slot-info">
                            <div class="slot-name" style="color: ${slotInfo.color};">${displayName}</div>
                            <div class="slot-time">${date} - ${jingjie} - ${jinian}</div>
                            <div class="slot-summary">${summary ? summary.substring(0, 40) + '...' : '无正文记录'}</div>
                        </div>
                        <div class="save-slot-actions">
                            <button class="interaction-btn btn-load-slot" style="padding: 8px 12px;">读档</button>
                            <button class="interaction-btn btn-export-slot" style="padding: 8px 12px;">导出</button>
                            <button class="interaction-btn btn-delete-slot" style="padding: 8px 12px; background: #8b0000;">删除</button>
                        </div>
                    `;
                } else {
                    autoSaveHtml += `
                        <div class="save-slot-info">
                            <div class="slot-name" style="color: ${slotInfo.color};">${slotInfo.name}</div>
                            <div class="slot-time" style="font-style: italic; color: #8b7355;">空存档位</div>
                        </div>
                        <div class="save-slot-actions">
                            <button class="interaction-btn btn-load-slot" style="padding: 8px 12px;" disabled>读档</button>
                            <button class="interaction-btn btn-export-slot" style="padding: 8px 12px;" disabled>导出</button>
                            <button class="interaction-btn btn-delete-slot" style="padding: 8px 12px; background: #8b0000;" disabled>删除</button>
                        </div>
                    `;
                }
                autoSaveHtml += `</div>`;
            });
            autoContainer.innerHTML = autoSaveHtml;

            // 2. 渲染手动存档槽位
            let manualHtml = '';
            const totalSlots = 5;
            for (let i = 1; i <= totalSlots; i++) {
              const slotId = `slot_${i}`;
              const saveData = saves[slotId];
              
              manualHtml += `<div class="save-slot" data-slot-id="${slotId}"><div class="save-slot-info">`;

              let statDataForRender = null;
              if (saveData && typeof saveData.mvu_data === 'object' && saveData.mvu_data !== null) {
                  statDataForRender = saveData.mvu_data.stat_data || (saveData.mvu_data['当前境界'] ? saveData.mvu_data : null);
              }

              if (statDataForRender) {
                const date = new Date(saveData.timestamp).toLocaleString('zh-CN');
                const jingjie = this.SafeGetValue(statDataForRender, '当前境界', '未知');
                const jinian = this.SafeGetValue(statDataForRender, '当前时间纪年', '未知');
                const summary = this._getDisplayText(saveData.message_content);
                const saveName = saveData.save_name || `存档 ${i}`;
                manualHtml += `
                    <div class="slot-name">${saveName}</div>
                    <div class="slot-time">${date} - ${jingjie} - ${jinian}</div>
                    <div class="slot-summary">${summary ? summary.substring(0, 40) + '...' : '无正文记录'}</div>
                `;
              } else {
                manualHtml += `
                    <div class="slot-name">存档 ${i}</div>
                    <div class="slot-time" style="font-style: italic; color: #8b7355;">空存档位</div>
                `;
              }

              manualHtml += `</div><div class="save-slot-actions">
                    <button class="interaction-btn btn-save-slot" style="padding: 8px 12px;">存档</button>
                    <button class="interaction-btn btn-load-slot" style="padding: 8px 12px;" ${!saveData ? 'disabled' : ''}>读档</button>
                    <button class="interaction-btn btn-export-slot" style="padding: 8px 12px;" ${!saveData ? 'disabled' : ''}>导出</button>
                    <button class="interaction-btn btn-delete-slot" style="padding: 8px 12px; background: #8b0000;" ${!saveData ? 'disabled' : ''}>删除</button>
                </div></div>`;
            }
            manualContainer.innerHTML = manualHtml;
          },

          getSavesFromStorage() {
            try {
              const saves = localStorage.getItem('guixu_multi_save_data');
              return saves ? JSON.parse(saves) : {};
            } catch (e) {
              console.error("获取存档失败:", e);
              return {};
            }
          },

          async saveGame(slotId) {
            try {
              // 首先弹出输入框让用户命名存档
              const saveName = await this.promptForSaveName(slotId);
              if (!saveName) {
                this.showTemporaryMessage('存档已取消');
                return;
              }

              const allSaves = this.getSavesFromStorage();
              const slotExists = allSaves[slotId];

              const performSave = async () => {
                try {
                  // 修复：优先使用缓存的mvu状态，如果没有再从消息获取
                  let currentMvuData = this.currentMvuState;
                  let currentMessageContent = '';
                  
                  if (!currentMvuData) {
                    console.log('[归墟存档] 缓存状态为空，尝试从消息获取...');
                    const messages = await getChatMessages(getCurrentMessageId());
                    if (!messages || messages.length === 0) {
                      this.showTemporaryMessage('错误：无法获取当前消息数据，无法存档。');
                      return;
                    }
                    currentMvuData = messages[0].data;
                    currentMessageContent = messages[0].message || '';
                  } else {
                    // 如果有缓存状态，也尝试获取当前消息内容
                    try {
                      const messages = await getChatMessages(getCurrentMessageId());
                      if (messages && messages.length > 0) {
                        currentMessageContent = messages[0].message || '';
                      }
                    } catch (e) {
                      console.warn('[归墟存档] 获取消息内容失败，使用空内容:', e);
                    }
                  }
                  
                  if (!currentMvuData || !currentMvuData.stat_data) {
                    this.showTemporaryMessage('错误：MVU数据不完整，无法存档。请先进行一次游戏操作。');
                    return;
                  }
                  
                  console.log('[归墟存档] 开始存档，数据检查通过');
                

                // --- 新逻辑：创建独立的世界书条目 ---
                const bookName = '1归墟';
                const index = this.unifiedIndex;
                const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';
                const pastLivesKey = index > 1 ? `往世涟漪(${index})` : '往世涟漪';
                
                // 生成独立世界书条目名称
                const saveJourneyEntryName = `${saveName}-本世历程`;
                const savePastLivesEntryName = `${saveName}-往世涟漪`;
                
                const novelModeIndex = this.unifiedIndex; // 修复：小说模式使用统一序号
                const novelModeKey = novelModeIndex > 1 ? `小说模式(${novelModeIndex})` : '小说模式';
                const saveNovelModeEntryName = `${saveName}-小说模式`;

                let lorebookEntries = {
                  journey_entry_name: saveJourneyEntryName,
                  past_lives_entry_name: savePastLivesEntryName,
                  novel_mode_entry_name: saveNovelModeEntryName
                };

                try {
                  const allEntries = await TavernHelper.getLorebookEntries(bookName);
                  const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);
                  const pastLivesEntry = allEntries.find(entry => entry.comment === pastLivesKey);
                  const novelModeEntry = allEntries.find(entry => entry.comment === novelModeKey);
                  
                  // 创建独立的世界书条目
                  const entriesToCreate = [];
                  
                  // 修复：即使内容为空也创建条目，避免存档失败
                  if (journeyEntry) {
                    entriesToCreate.push({
                      comment: saveJourneyEntryName,
                      content: journeyEntry.content || '', // 允许空内容
                      keys: [saveJourneyEntryName],
                      enabled: false, // 默认禁用
                      position: 'before_character_definition',
                      order: 20
                    });
                    console.log(`[归墟存档] 准备创建本世历程条目，内容长度: ${(journeyEntry.content || '').length}`);
                  } else {
                    // 如果找不到原始条目，创建一个空的
                    entriesToCreate.push({
                      comment: saveJourneyEntryName,
                      content: '# 本世历程\n暂无记录',
                      keys: [saveJourneyEntryName],
                      enabled: false,
                      position: 'before_character_definition',
                      order: 20
                    });
                    console.log(`[归墟存档] 原始本世历程条目不存在，创建空条目`);
                  }
                  
                  if (pastLivesEntry) {
                    entriesToCreate.push({
                      comment: savePastLivesEntryName,
                      content: pastLivesEntry.content || '', // 允许空内容
                      keys: [savePastLivesEntryName],
                      enabled: false, // 默认禁用
                      position: 'before_character_definition',
                      order: 19
                    });
                    console.log(`[归墟存档] 准备创建往世涟漪条目，内容长度: ${(pastLivesEntry.content || '').length}`);
                  } else {
                    // 如果找不到原始条目，创建一个空的
                    entriesToCreate.push({
                      comment: savePastLivesEntryName,
                      content: '# 往世涟漪\n暂无记录',
                      keys: [savePastLivesEntryName],
                      enabled: false,
                      position: 'before_character_definition',
                      order: 19
                    });
                    console.log(`[归墟存档] 原始往世涟漪条目不存在，创建空条目`);
                  }

                  if (novelModeEntry) {
                    entriesToCreate.push({
                      comment: saveNovelModeEntryName,
                      content: novelModeEntry.content || '', // 允许空内容
                      keys: [saveNovelModeEntryName],
                      enabled: false, // 默认禁用
                      position: 'before_character_definition',
                      order: 18 // Give it a different order
                    });
                    console.log(`[归墟存档] 准备创建小说模式条目，内容长度: ${(novelModeEntry.content || '').length}`);
                  } else {
                     entriesToCreate.push({
                      comment: saveNovelModeEntryName,
                      content: '# 小说模式\n暂无记录',
                      keys: [saveNovelModeEntryName],
                      enabled: false,
                      position: 'before_character_definition',
                      order: 18
                    });
                    console.log(`[归墟存档] 原始小说模式条目不存在，创建空条目`);
                  }
                  
                  if (entriesToCreate.length > 0) {
                    await TavernHelper.createLorebookEntries(bookName, entriesToCreate);
                    console.log(`[归墟存档] 已创建 ${entriesToCreate.length} 个独立世界书条目`);
                  }
                  
                } catch (e) {
                  console.error("创建独立世界书条目时出错:", e);
                  this.showTemporaryMessage("警告：创建世界书条目失败，但主数据仍会保存。");
                }
                // --- 新逻辑结束 ---
                
                const saveDataPayload = {
                  timestamp: new Date().toISOString(),
                  save_name: saveName, 
                  message_content: currentMessageContent,
                  lorebook_entries: lorebookEntries, 
                  gacha_data: { 
                      state: _.cloneDeep(this.gachaState),
                      collection: _.cloneDeep(this.gachaCollection),
                      history: _.cloneDeep(this.gachaHistory)
                  },
                  mvu_data: {
                    stat_data: currentMvuData.stat_data,
                    schema: currentMvuData.schema,
                    initialized_lorebooks: currentMvuData.initialized_lorebooks,
                    display_data: currentMvuData.display_data,
                    delta_data: currentMvuData.delta_data,
                  }
                };

                allSaves[slotId] = saveDataPayload;

                localStorage.setItem('guixu_multi_save_data', JSON.stringify(allSaves));
                this.showTemporaryMessage(`存档"${saveName}"已保存到存档位 ${slotId.split('_')[1]}`);
                this.showSaveLoadManager(); // 刷新UI
                } catch (error) {
                  console.error('存档失败:', error);
                  this.showTemporaryMessage(`存档失败: ${error.message}`);
                }
              };

              if (slotExists) {
                this.showCustomConfirm(`存档位 ${slotId.split('_')[1]} 已有数据，确定要覆盖吗？`, performSave);
              } else {
                await performSave();
              }
            } catch (error) {
              console.error('存档过程中发生错误:', error);
              this.showTemporaryMessage(`存档失败: ${error.message}`);
            }
          },

          async loadGame(slotId) {
            const allSaves = this.getSavesFromStorage();
            const saveData = allSaves[slotId];
            
            if (!saveData) {
              this.showTemporaryMessage('没有找到存档文件。');
              return;
            }

            const saveName = saveData.save_name || `存档${slotId.split('_')[1]}`;
            this.showCustomConfirm(`确定要读取存档"${saveName}"吗？当前所有未保存的进度将会被覆盖。`, async () => {
              try {
                console.log(`[归墟无缝读档] 开始读取存档"${saveName}"`);
                
                // 显示读档进度提示
                this.updateWaitingMessage('正在读取存档数据，请稍候...');
                
                const messages = await getChatMessages(getCurrentMessageId());
                if (!messages || messages.length === 0) {
                  this.hideWaitingMessage();
                  this.showTemporaryMessage('错误：无法获取当前消息，无法读档。');
                  return;
                }
                
                const messageZero = messages[0];
                const loadedData = saveData.mvu_data;
                const loadedMessageContent = saveData.message_content || '';

                // 1. 更新消息数据（使用无刷新模式）
                messageZero.data = loadedData;
                messageZero.message = loadedMessageContent;

                // --- 2. 从独立世界书恢复到当前序号 ---
                if (saveData.lorebook_entries) {
                  this.updateWaitingMessage('正在恢复世界书数据...');
                  
                  const entries = saveData.lorebook_entries;
                  const bookName = '1归墟';
                  const currentIndex = this.unifiedIndex;
                  const currentJourneyKey = currentIndex > 1 ? `本世历程(${currentIndex})` : '本世历程';
                  const currentPastLivesKey = currentIndex > 1 ? `往世涟漪(${currentIndex})` : '往世涟漪';
                  const novelModeIndex = this.unifiedIndex;
                  const currentNovelModeKey = novelModeIndex > 1 ? `小说模式(${novelModeIndex})` : '小说模式';

                  try {
                    const allEntries = await TavernHelper.getLorebookEntries(bookName);
                    
                    // 查找存档的独立世界书条目
                    const saveJourneyEntry = allEntries.find(entry => entry.comment === entries.journey_entry_name);
                    const savePastLivesEntry = allEntries.find(entry => entry.comment === entries.past_lives_entry_name);
                    const saveNovelModeEntry = allEntries.find(entry => entry.comment === entries.novel_mode_entry_name);
                    
                    // 查找当前序号的世界书条目
                    const currentJourneyEntry = allEntries.find(entry => entry.comment === currentJourneyKey);
                    const currentPastLivesEntry = allEntries.find(entry => entry.comment === currentPastLivesKey);
                    const currentNovelModeEntry = allEntries.find(entry => entry.comment === currentNovelModeKey);
                    
                    const entriesToUpdate = [];
                    
                    // 覆写本世历程
                    if (saveJourneyEntry) {
                      const contentToRestore = saveJourneyEntry.content || '';
                      if (currentJourneyEntry) {
                        entriesToUpdate.push({
                          uid: currentJourneyEntry.uid,
                          content: contentToRestore
                        });
                        console.log(`[归墟无缝读档] 更新本世历程条目，内容长度: ${contentToRestore.length}`);
                      } else {
                        await TavernHelper.createLorebookEntries(bookName, [{
                          comment: currentJourneyKey,
                          content: contentToRestore,
                          keys: [currentJourneyKey],
                          enabled: true,
                          position: 'before_character_definition',
                          order: 20
                        }]);
                        console.log(`[归墟无缝读档] 创建本世历程条目，内容长度: ${contentToRestore.length}`);
                      }
                    }
                    
                    // 覆写往世涟漪
                    if (savePastLivesEntry) {
                      const contentToRestore = savePastLivesEntry.content || '';
                      if (currentPastLivesEntry) {
                        entriesToUpdate.push({
                          uid: currentPastLivesEntry.uid,
                          content: contentToRestore
                        });
                        console.log(`[归墟无缝读档] 更新往世涟漪条目，内容长度: ${contentToRestore.length}`);
                      } else {
                        await TavernHelper.createLorebookEntries(bookName, [{
                          comment: currentPastLivesKey,
                          content: contentToRestore,
                          keys: [currentPastLivesKey],
                          enabled: true,
                          position: 'before_character_definition',
                          order: 19
                        }]);
                        console.log(`[归墟无缝读档] 创建往世涟漪条目，内容长度: ${contentToRestore.length}`);
                      }
                    }

                    // 覆写小说模式
                    if (saveNovelModeEntry) {
                      const contentToRestore = saveNovelModeEntry.content || '';
                      if (currentNovelModeEntry) {
                        entriesToUpdate.push({
                          uid: currentNovelModeEntry.uid,
                          content: contentToRestore
                        });
                        console.log(`[归墟无缝读档] 更新小说模式条目，内容长度: ${contentToRestore.length}`);
                      } else {
                        await TavernHelper.createLorebookEntries(bookName, [{
                          comment: currentNovelModeKey,
                          content: contentToRestore,
                          keys: [currentNovelModeKey],
                          enabled: false,
                          position: 'before_character_definition',
                          order: 18
                        }]);
                        console.log(`[归墟无缝读档] 创建小说模式条目，内容长度: ${contentToRestore.length}`);
                      }
                    }
                    
                    // 批量更新现有条目
                    if (entriesToUpdate.length > 0) {
                      await TavernHelper.setLorebookEntries(bookName, entriesToUpdate);
                    }
                    
                    console.log(`[归墟无缝读档] 已将存档"${saveName}"的世界书数据覆写到当前序号 ${currentIndex}`);
                    
                  } catch (e) {
                    console.error("恢复世界书数据时出错:", e);
                    this.showTemporaryMessage("警告：恢复世界书数据失败，但主数据已恢复。");
                  }
                }

                // 3. 无缝更新消息数据（关键：使用 refresh: 'none'）
                this.updateWaitingMessage('正在更新界面数据...');
                await TavernHelper.setChatMessages([messageZero], { refresh: 'none' });
                
                // 4. 直接更新MVU状态和UI（无需重新初始化）
                this.currentMvuState = this._safeLoadMvuData(loadedData);
                // 恢复Gacha状态到内存
                this._loadGachaDataFromSave(saveData);
                
                // 5. 直接更新游戏文本显示
                const gameTextDisplay = document.getElementById('game-text-display');
                if (gameTextDisplay && loadedMessageContent) {
                  const displayText = this._getDisplayText(loadedMessageContent);
                  gameTextDisplay.innerHTML = this.formatMessageContent(displayText);
                  this.updateLiveWordCount(); // 新增：调用字数统计函数
                  
                  // 更新有效内容缓存，支持后续回退功能
                  this.lastValidGametxtHTML = gameTextDisplay.innerHTML;
                }
                
                // 6. 更新UI显示（只更新必要部分，保持其他状态）
                this.renderUI(this.currentMvuState.stat_data);
                this.loadEquipmentState(); // 重新加载装备状态
                
                // 7. 提取并更新相关内容
                if (loadedMessageContent) {
                  this.lastExtractedNovelText = this._extractLastTagContent('gametxt', loadedMessageContent);
                  this.lastExtractedJourney = this._extractLastTagContent('本世历程', loadedMessageContent);
                  this.lastExtractedPastLives = this._extractLastTagContent('往世涟漪', loadedMessageContent);
                  this.lastExtractedThinking = this._extractLastTagContent('thinking', loadedMessageContent, true);
                  this.lastExtractedVariables = this._extractLastTagContent('UpdateVariable', loadedMessageContent, true);
                  
                  // 更新相关UI组件
                  this.updateThinkingButtonVisibility();
                  this.updateVariableChangesReminder();
                }

                // 新增：读档成功后，触发一次分段记忆更新，确保内容同步
                if (this.isSegmentedMemoryAutoGenerateEnabled) {
                    console.log('[归墟] 读档完成，触发分段记忆更新...');
                    await this.generateSegmentedMemory(false);
                }

                this.hideWaitingMessage();
                this.showTemporaryMessage(`无缝读档"${saveName}"成功！`);
                
                // 8. 读档完成后关闭存档界面，显示主界面
                this.closeAllModals();
                
                console.log(`[归墟无缝读档] 读档完成，已返回主界面`);

              } catch (error) {
                console.error('无缝读档失败:', error);
                this.hideWaitingMessage();
                this.showTemporaryMessage(`读档失败: ${error.message}`);
              }
            });
          },


          deleteSave(slotId) {
            const allSaves = this.getSavesFromStorage();
            const saveData = allSaves[slotId];
            const saveName = saveData?.save_name || `存档 ${slotId.replace('slot_', '')}`;

            let confirmMessage = `确定要删除存档“${saveName}”吗？此操作不可恢复。`;
            if (saveData && saveData.lorebook_entries) {
                confirmMessage += `\n相关的世界书条目也会被一并删除。`;
            }

            this.showCustomConfirm(confirmMessage, async () => {
              try {
                // 对所有包含 lorebook_entries 的存档执行删除操作
                if (saveData && saveData.lorebook_entries) {
                  const bookName = '1归墟';
                  const entryNamesToDelete = Object.values(saveData.lorebook_entries);
                  
                  if (entryNamesToDelete.length > 0) {
                    console.log(`[归墟删除] 准备删除世界书条目:`, entryNamesToDelete);
                    const allEntries = await TavernHelper.getLorebookEntries(bookName);
                    const uidsToDelete = allEntries
                      .filter(entry => entryNamesToDelete.includes(entry.comment))
                      .map(entry => entry.uid);

                    if (uidsToDelete.length > 0) {
                      await TavernHelper.deleteLorebookEntries(bookName, uidsToDelete);
                      console.log(`[归墟删除] 已成功删除 ${uidsToDelete.length} 个关联的世界书条目。`);
                    }
                  }
                }

                // 从localStorage中删除存档记录
                delete allSaves[slotId];
                localStorage.setItem('guixu_multi_save_data', JSON.stringify(allSaves));
                
                this.showTemporaryMessage(`存档“${saveName}”已删除。`);
                this.showSaveLoadManager(); // 刷新UI

              } catch (error) {
                console.error('删除存档失败:', error);
                this.showTemporaryMessage(`删除存档失败: ${error.message}`);
              }
            });
          },

          clearAllSaves() {
            this.showCustomConfirm(`你确定要清除所有存档吗？这个操作会删除所有5个存档槽位的数据，且不可恢复。`, () => {
              try {
                localStorage.removeItem('guixu_multi_save_data');
                this.showTemporaryMessage(`所有存档已清除。`);
                this.showSaveLoadManager(); // 刷新UI
              } catch (error) {
                console.error('清除所有存档失败:', error);
                this.showTemporaryMessage(`清除存档失败: ${error.message}`);
              }
            });
          },

          // --- 新增：存档命名输入框 ---
          async promptForSaveName(slotId) {
            console.log('[归墟存档] 显示存档命名对话框');
            return new Promise((resolve) => {
              try {
                // 创建模态框
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.style.display = 'flex';
                modal.style.zIndex = '2000'; // 确保在最顶层
                modal.innerHTML = `
                  <div class="modal-content" style="width: 400px; height: auto; max-height: none;">
                    <div class="modal-header">
                      <h2 class="modal-title">存档命名</h2>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                      <p style="margin-bottom: 15px; color: #c9aa71;">请为存档位 ${slotId.split('_')[1]} 输入一个名称：</p>
                      <input type="text" id="save-name-input" placeholder="例如：突破金丹期"
                             style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid #8b7355;
                                    color: #e0dcd1; border-radius: 4px; font-size: 14px; margin-bottom: 15px;">
                      <p style="font-size: 12px; color: #8b7355; margin-bottom: 20px;">
                        将创建世界书条目：<br>
                        • <span id="preview-journey">存档名-本世历程</span><br>
                        • <span id="preview-past-lives">存档名-往世涟漪</span><br>
                        • <span id="preview-novel-mode">存档名-小说模式</span>
                      </p>
                      <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="save-name-cancel" class="interaction-btn">取消</button>
                        <button id="save-name-confirm" class="interaction-btn primary-btn">确认</button>
                      </div>
                    </div>
                  </div>
                `;

                const container = document.querySelector('.guixu-root-container');
                if (!container) {
                  console.error('[归墟存档] 找不到根容器');
                  resolve(null);
                  return;
                }
                container.appendChild(modal);

                const input = modal.querySelector('#save-name-input');
                const previewJourney = modal.querySelector('#preview-journey');
                const previewPastLives = modal.querySelector('#preview-past-lives');
                const previewNovelMode = modal.querySelector('#preview-novel-mode');
                const confirmBtn = modal.querySelector('#save-name-confirm');
                const cancelBtn = modal.querySelector('#save-name-cancel');

                if (!input || !confirmBtn || !cancelBtn) {
                  console.error('[归墟存档] 模态框元素创建失败');
                  modal.remove();
                  resolve(null);
                  return;
                }

                // 实时更新预览
                input.addEventListener('input', () => {
                  const name = input.value.trim() || '存档名';
                  if (previewJourney) previewJourney.textContent = `${name}-本世历程`;
                  if (previewPastLives) previewPastLives.textContent = `${name}-往世涟漪`;
                  if (previewNovelMode) previewNovelMode.textContent = `${name}-小说模式`;
                });

                // 确认按钮
                confirmBtn.addEventListener('click', () => {
                  const saveName = input.value.trim();
                  if (!saveName) {
                    this.showTemporaryMessage('请输入存档名称');
                    return;
                  }
                  console.log('[归墟存档] 用户输入存档名称:', saveName);
                  modal.remove();
                  resolve(saveName);
                });

                // 取消按钮
                cancelBtn.addEventListener('click', () => {
                  console.log('[归墟存档] 用户取消存档');
                  modal.remove();
                  resolve(null);
                });

                // 回车确认
                input.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') {
                    confirmBtn.click();
                  }
                });

                // 自动聚焦
                setTimeout(() => {
                  try {
                    input.focus();
                  } catch (e) {
                    console.warn('[归墟存档] 自动聚焦失败:', e);
                  }
                }, 100);

              } catch (error) {
                console.error('[归墟存档] 创建存档命名对话框时出错:', error);
                resolve(null);
              }
            });
          },

          // --- 新增：自动存档核心功能 ---
          saveAutoSaveState() {
            try {
              localStorage.setItem('guixu_auto_save_enabled', this.isAutoSaveEnabled);
            } catch (e) {
              console.error('保存自动存档状态失败:', e);
            }
          },

          loadAutoSaveState() {
            try {
              const savedState = localStorage.getItem('guixu_auto_save_enabled');
              this.isAutoSaveEnabled = savedState === 'true'; // 默认为 false
              const checkbox = document.getElementById('auto-save-checkbox');
              if (checkbox) {
                checkbox.checked = this.isAutoSaveEnabled;
              }
            } catch (e) {
              console.error('加载自动存档状态失败:', e);
              this.isAutoSaveEnabled = false;
            }
          },

          async performAutoSave() {
            console.log('[归墟] 执行五缓冲自动存档...');
            try {
                // --- 1. 数据准备 ---
                const currentMvuData = this.currentMvuState;
                let currentMessageContent = '';
                try {
                    const messages = await getChatMessages(getCurrentMessageId());
                    if (messages && messages.length > 0) {
                        const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant');
                        if (lastAiMessage) currentMessageContent = lastAiMessage.message || '';
                    }
                } catch (e) {
                    console.warn('[归墟自动存档] 获取消息内容失败:', e);
                }

                if (!currentMvuData || !currentMvuData.stat_data) {
                    console.error('[归墟自动存档] MVU数据不完整，自动存档失败。');
                    return;
                }

                const bookName = '1归墟';
                const allSaves = this.getSavesFromStorage();
                const allEntries = await TavernHelper.getLorebookEntries(bookName);
                
                const autoSaveConfig = [
                    { id: 'auto_save_slot_0', name: '自动存档-1 (最新)' },
                    { id: 'auto_save_slot_1', name: '自动存档-2' },
                    { id: 'auto_save_slot_2', name: '自动存档-3' },
                    { id: 'auto_save_slot_3', name: '自动存档-4' },
                    { id: 'auto_save_slot_4', name: '自动存档-5 (最旧)' }
                ];
                const numSlots = autoSaveConfig.length;

                // --- 2. 轮换 localStorage 中的存档数据 (从后往前) ---
                for (let i = numSlots - 1; i > 0; i--) {
                    const currentSlotId = autoSaveConfig[i].id;
                    const previousSlotId = autoSaveConfig[i - 1].id;
                    if (allSaves[previousSlotId]) {
                        allSaves[currentSlotId] = allSaves[previousSlotId];
                    }
                }

                // --- 3. 轮换世界书条目 (从后往前) ---
                const entriesToUpdate = [];
                const entriesToCreate = [];

                for (let i = numSlots - 1; i > 0; i--) {
                    const currentConfig = autoSaveConfig[i];
                    const prevConfig = autoSaveConfig[i - 1];

                    const prevJourneyKey = `自动存档(${prevConfig.name})：本世历程`;
                    const prevPastLivesKey = `自动存档(${prevConfig.name})：往世涟漪`;
                    const prevNovelModeKey = `自动存档(${prevConfig.name})：小说模式`;

                    const currentJourneyKey = `自动存档(${currentConfig.name})：本世历程`;
                    const currentPastLivesKey = `自动存档(${currentConfig.name})：往世涟漪`;
                    const currentNovelModeKey = `自动存档(${currentConfig.name})：小说模式`;

                    const prevJourneyEntry = allEntries.find(e => e.comment === prevJourneyKey);
                    const prevPastLivesEntry = allEntries.find(e => e.comment === prevPastLivesKey);
                    const prevNovelModeEntry = allEntries.find(e => e.comment === prevNovelModeKey);

                    const currentJourneyEntry = allEntries.find(e => e.comment === currentJourneyKey);
                    const currentPastLivesEntry = allEntries.find(e => e.comment === currentPastLivesKey);
                    const currentNovelModeEntry = allEntries.find(e => e.comment === currentNovelModeKey);

                    if (prevJourneyEntry) {
                        if (currentJourneyEntry) entriesToUpdate.push({ uid: currentJourneyEntry.uid, content: prevJourneyEntry.content });
                        else entriesToCreate.push({ comment: currentJourneyKey, content: prevJourneyEntry.content, keys: [currentJourneyKey], enabled: false, position: 'before_character_definition', order: 18 - i });
                    }
                    if (prevPastLivesEntry) {
                        if (currentPastLivesEntry) entriesToUpdate.push({ uid: currentPastLivesEntry.uid, content: prevPastLivesEntry.content });
                        else entriesToCreate.push({ comment: currentPastLivesKey, content: prevPastLivesEntry.content, keys: [currentPastLivesKey], enabled: false, position: 'before_character_definition', order: 17 - i });
                    }
                    if (prevNovelModeEntry) {
                        if (currentNovelModeEntry) entriesToUpdate.push({ uid: currentNovelModeEntry.uid, content: prevNovelModeEntry.content });
                        else entriesToCreate.push({ comment: currentNovelModeKey, content: prevNovelModeEntry.content, keys: [currentNovelModeKey], enabled: false, position: 'before_character_definition', order: 16 - i });
                    }
                }

                // --- 4. 获取当前游戏内容，并写入最新的存档槽位 (slot 0) ---
                const latestConfig = autoSaveConfig[0];
                const latestJourneyKey = `自动存档(${latestConfig.name})：本世历程`;
                const latestPastLivesKey = `自动存档(${latestConfig.name})：往世涟漪`;
                const latestNovelModeKey = `自动存档(${latestConfig.name})：小说模式`;

                const latestJourneyEntry = allEntries.find(e => e.comment === latestJourneyKey);
                const latestPastLivesEntry = allEntries.find(e => e.comment === latestPastLivesKey);
                const latestNovelModeEntry = allEntries.find(e => e.comment === latestNovelModeKey);

                const currentJourneyEntry = allEntries.find(entry => entry.comment === (this.unifiedIndex > 1 ? `本世历程(${this.unifiedIndex})` : '本世历程'));
                const currentPastLivesEntry = allEntries.find(entry => entry.comment === (this.unifiedIndex > 1 ? `往世涟漪(${this.unifiedIndex})` : '往世涟漪'));
                const currentNovelModeEntry = allEntries.find(entry => entry.comment === (this.unifiedIndex > 1 ? `小说模式(${this.unifiedIndex})` : '小说模式'));
                
                const journeyContent = currentJourneyEntry ? currentJourneyEntry.content : '';
                const pastLivesContent = currentPastLivesEntry ? currentPastLivesEntry.content : '';
                const novelModeContent = currentNovelModeEntry ? currentNovelModeEntry.content : '';

                if (latestJourneyEntry) entriesToUpdate.push({ uid: latestJourneyEntry.uid, content: journeyContent });
                else entriesToCreate.push({ comment: latestJourneyKey, content: journeyContent, keys: [latestJourneyKey], enabled: false, position: 'before_character_definition', order: 20 });

                if (latestPastLivesEntry) entriesToUpdate.push({ uid: latestPastLivesEntry.uid, content: pastLivesContent });
                else entriesToCreate.push({ comment: latestPastLivesKey, content: pastLivesContent, keys: [latestPastLivesKey], enabled: false, position: 'before_character_definition', order: 19 });
                
                if (latestNovelModeEntry) entriesToUpdate.push({ uid: latestNovelModeEntry.uid, content: novelModeContent });
                else entriesToCreate.push({ comment: latestNovelModeKey, content: novelModeContent, keys: [latestNovelModeKey], enabled: false, position: 'before_character_definition', order: 18 });

                // --- 5. 执行世界书操作 ---
                if (entriesToCreate.length > 0) await TavernHelper.createLorebookEntries(bookName, entriesToCreate);
                if (entriesToUpdate.length > 0) await TavernHelper.setLorebookEntries(bookName, entriesToUpdate);

                // --- 6. 创建新的“最新”存档并保存 ---
                const newSaveDataPayload = {
                    timestamp: new Date().toISOString(),
                    save_name: latestConfig.name,
                    message_content: currentMessageContent,
                    mvu_data: currentMvuData,
                    is_auto_save: true,
                    gacha_data: {
                        state: _.cloneDeep(this.gachaState),
                        collection: _.cloneDeep(this.gachaCollection),
                        history: _.cloneDeep(this.gachaHistory)
                    },
                    lorebook_entries: {
                        journey_entry_name: latestJourneyKey,
                        past_lives_entry_name: latestPastLivesKey,
                        novel_mode_entry_name: latestNovelModeKey
                    }
                };
                allSaves[latestConfig.id] = newSaveDataPayload;
                
                // --- 7. 更新所有自动存档的名称和关联条目 ---
                for (const config of autoSaveConfig) {
                    if (allSaves[config.id]) {
                        allSaves[config.id].save_name = config.name;
                        allSaves[config.id].lorebook_entries = {
                            journey_entry_name: `自动存档(${config.name})：本世历程`,
                            past_lives_entry_name: `自动存档(${config.name})：往世涟漪`,
                            novel_mode_entry_name: `自动存档(${config.name})：小说模式`
                        };
                    }
                }

                localStorage.setItem('guixu_multi_save_data', JSON.stringify(allSaves));

                this.showTemporaryMessage('自动存档成功', 1500);
                console.log('[归墟] 五缓冲自动存档成功。');

            } catch (error) {
                console.error('[归墟] 自动存档失败:', error);
                this.showTemporaryMessage(`自动存档失败: ${error.message}`);
            }
          },

          // --- 新增：存档导入/导出功能 ---
          async exportSave(slotId) {
            this.showTemporaryMessage('正在准备导出数据...', 2000);
            try {
                const allSaves = this.getSavesFromStorage();
                const saveData = allSaves[slotId];

                if (!saveData) {
                    this.showTemporaryMessage('错误：找不到要导出的存档数据。');
                    return;
                }

                const exportData = {
                    exportVersion: '1.0',
                    exportedAt: new Date().toISOString(),
                    saveData: saveData,
                    lorebookData: []
                };

                // 如果存在世界书条目关联，则读取其内容
                if (saveData.lorebook_entries && typeof saveData.lorebook_entries === 'object') {
                    const bookName = '1归墟';
                    const entryNamesToExport = Object.values(saveData.lorebook_entries);
                    if (entryNamesToExport.length > 0) {
                        const allLorebookEntries = await TavernHelper.getLorebookEntries(bookName);
                        exportData.lorebookData = allLorebookEntries.filter(entry =>
                            entryNamesToExport.includes(entry.comment)
                        );
                    }
                }

                const jsonString = JSON.stringify(exportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                const safeSaveName = (saveData.save_name || slotId).replace(/[^a-z0-9_\-]/gi, '_');
                a.download = `GuixuSave_${safeSaveName}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showTemporaryMessage('存档已成功导出！');

            } catch (error) {
                console.error('导出存档时出错:', error);
                this.showTemporaryMessage(`导出失败: ${error.message}`);
            }
          },

          async handleFileImport(event) {
              const file = event.target.files[0];
              if (!file) return;

              this.showTemporaryMessage('正在导入存档...', 3000);
              const reader = new FileReader();

              reader.onload = async (e) => {
                  try {
                      const importData = JSON.parse(e.target.result);

                      // 1. 验证导入数据
                      if (importData.exportVersion !== '1.0' || !importData.saveData || !importData.lorebookData) {
                          throw new Error('存档文件格式无效或已损坏。');
                      }

                      const allSaves = this.getSavesFromStorage();
                      
                      // 2. 寻找空的手动存档槽位
                      let emptySlotId = null;
                      for (let i = 1; i <= 5; i++) {
                          const slotId = `slot_${i}`;
                          if (!allSaves[slotId]) {
                              emptySlotId = slotId;
                              break;
                          }
                      }

                      if (!emptySlotId) {
                          throw new Error('没有可用的手动存档槽位。请先删除一个。');
                      }

                      const bookName = '1归墟';
                      const currentEntries = await TavernHelper.getLorebookEntries(bookName);
                      const currentEntryNames = new Set(currentEntries.map(entry => entry.comment));
                      
                      const newSaveData = _.cloneDeep(importData.saveData);
                      const entriesToCreate = [];

                      // 3. 处理世界书条目冲突并准备创建
                      for (const entryToImport of importData.lorebookData) {
                          let newEntryName = entryToImport.comment;
                          let originalEntryName = entryToImport.comment;

                          // 如果条目名已存在，则重命名
                          if (currentEntryNames.has(newEntryName)) {
                              newEntryName = `${newEntryName}_imported_${Date.now()}`;
                              this.showTemporaryMessage(`世界书条目“${originalEntryName}”已存在，重命名为“${newEntryName}”`, 4000);
                          }
                          
                          const newEntry = { ...entryToImport };
                          delete newEntry.uid; // 必须删除旧的uid
                          newEntry.comment = newEntryName;
                          newEntry.keys = [newEntryName]; // 更新关键字
                          newEntry.enabled = false; // 导入后默认禁用
                          entriesToCreate.push(newEntry);

                          // 4. 更新存档数据中对世界书条目的引用
                          for (const key in newSaveData.lorebook_entries) {
                              if (newSaveData.lorebook_entries[key] === originalEntryName) {
                                  newSaveData.lorebook_entries[key] = newEntryName;
                              }
                          }
                      }
                      
                      // 5. 创建世界书条目
                      if (entriesToCreate.length > 0) {
                          await TavernHelper.createLorebookEntries(bookName, entriesToCreate);
                      }

                      // 6. 写入存档数据到localStorage
                      newSaveData.save_name = `${newSaveData.save_name} (导入)`; // 标记为导入存档
                      allSaves[emptySlotId] = newSaveData;
                      localStorage.setItem('guixu_multi_save_data', JSON.stringify(allSaves));

                      this.showTemporaryMessage(`存档已成功导入到槽位 ${emptySlotId.split('_')[1]}！`);
                      this.showSaveLoadManager(); // 刷新UI

                  } catch (error) {
                      console.error('导入存档时出错:', error);
                      this.showTemporaryMessage(`导入失败: ${error.message}`);
                  } finally {
                      // 清空file input的值，以便可以再次选择同一个文件
                      event.target.value = '';
                  }
              };

              reader.readAsText(file);
          },

           // --- 新增：行动选项状态存取 ---
           saveActionOptionsState() {
             try {
               localStorage.setItem('guixu_action_options_enabled', this.isActionOptionsEnabled);
             } catch (e) {
               console.error('保存行动选项状态失败:', e);
             }
         },
         // --- 新增：行动选项自动发送状态存取 ---
         saveActionAutoSendState() {
           try {
             localStorage.setItem('guixu_action_auto_send_enabled', this.isActionAutoSend);
           } catch (e) {
             console.error('保存行动选项自动发送状态失败:', e);
           }
         },
         loadActionAutoSendState() {
           try {
             const savedState = localStorage.getItem('guixu_action_auto_send_enabled');
             // 默认为 true (开启)
             this.isActionAutoSend = savedState === null ? true : savedState === 'true';
             const checkbox = document.getElementById('auto-send-action-checkbox');
             if (checkbox) {
               checkbox.checked = this.isActionAutoSend;
             }
           } catch (e) {
             console.error('加载行动选项自动发送状态失败:', e);
             this.isActionAutoSend = true;
           }
         },

           loadActionOptionsState() {
             try {
               const savedState = localStorage.getItem('guixu_action_options_enabled');
               // 默认为 true (开启)
               this.isActionOptionsEnabled = savedState === null ? true : savedState === 'true';
               const checkbox = document.getElementById('action-options-enabled-checkbox');
               if (checkbox) {
                 checkbox.checked = this.isActionOptionsEnabled;
               }
             } catch (e) {
               console.error('加载行动选项状态失败:', e);
               this.isActionOptionsEnabled = true;
             }
           },

          // --- 新增：自动化系统修剪功能 ---
          showTrimJourneyModal() {
              this.openModal('trim-journey-modal', true); // keepOpen = true to show over history modal
              const indexInput = document.getElementById('trim-journey-index-input');
              if (indexInput) {
                  indexInput.value = this.unifiedIndex;
              }
          },

          _getTrimmedJourneyContent(fullContent) {
              if (!fullContent) return fullContent;
              const events = this.parseJourneyEntry(fullContent);
              if (events.length <= 2) {
                  return fullContent; // 不需要修剪
              }

              let trimCount = 0;
              events.forEach((event, idx) => {
                  if (idx < events.length - 2) {
                      if (event['自动化系统']) {
                          delete event['自动化系统'];
                          trimCount++;
                      }
                  }
              });

              if (trimCount === 0) {
                  return fullContent; // 没有内容被改变
              }

              // 重构内容字符串
              const newContent = events.map(event => {
                  const fieldOrder = ['序号', '日期', '标题', '地点', '人物', '描述', '人物关系', '标签', '重要信息', '暗线与伏笔', '自动化系统'];
                  return fieldOrder
                      .map(key => (event[key] ? `${key}|${event[key]}` : null))
                      .filter(Boolean)
                      .join('\n');
              }).join('\n\n');

              console.log(`[归墟-内部修剪] 成功移除 ${trimCount} 条自动化系统记录。`);
              return newContent;
          },

          async trimJourneyAutomation(index, silent = false) {
              const bookName = '1归墟';
              const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';
              if (!silent) this.showTemporaryMessage(`正在开始修剪序号 ${index} 的本世历程...`);

              try {
                  const allEntries = await TavernHelper.getLorebookEntries(bookName);
                  const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);

                  if (!journeyEntry || !journeyEntry.content) {
                      if (!silent) this.showTemporaryMessage(`错误：找不到或内容为空，无法修剪。`, 3000);
                      return;
                  }

                  const newContent = this._getTrimmedJourneyContent(journeyEntry.content);

                  if (newContent === journeyEntry.content) {
                      if (!silent) this.showTemporaryMessage('没有需要修剪的自动化内容。');
                      return;
                  }
                  
                  await TavernHelper.setLorebookEntries(bookName, [{ uid: journeyEntry.uid, content: newContent }]);

                  if (!silent) {
                    this.showTemporaryMessage(`修剪成功！`, 3000);
                    this.closeModal('trim-journey-modal');
                    this.showJourney(); // 刷新视图
                  }

              } catch (error) {
                  console.error('修剪本世历程时出错:', error);
                  if (!silent) this.showTemporaryMessage(`修剪失败: ${error.message}`, 3000);
              }
          },

          // --- 新增：自动修剪状态存取 ---
          saveAutoTrimState() {
              try {
                  localStorage.setItem('guixu_auto_trim_enabled', this.isAutoTrimEnabled);
              } catch (e) {
                  console.error('保存自动修剪状态失败:', e);
              }
          },

          loadAutoTrimState() {
              try {
                  const savedState = localStorage.getItem('guixu_auto_trim_enabled');
                  this.isAutoTrimEnabled = savedState === 'true'; // 默认为 false
                  // 注意：复选框是在 showJourney 时动态创建的，所以在这里无法直接更新它
              } catch (e) {
                  console.error('加载自动修剪状态失败:', e);
                  this.isAutoTrimEnabled = false;
              }
          },

         // --- 新增：流式开关状态存取 ---
         saveStreamingState() {
             try {
                 localStorage.setItem('guixu_streaming_enabled', this.isStreamingEnabled);
             } catch (e) {
                 console.error('保存流式状态失败:', e);
             }
         },
         loadStreamingState() {
             try {
                 const savedState = localStorage.getItem('guixu_streaming_enabled');
                 // 默认为 true (开启)
                 this.isStreamingEnabled = savedState === null ? true : savedState === 'true';
                 const checkbox = document.getElementById('streaming-enabled-checkbox');
                 if (checkbox) {
                     checkbox.checked = this.isStreamingEnabled;
                 }
             } catch (e) {
                 console.error('加载流式状态失败:', e);
                 this.isStreamingEnabled = true;
             }
         },

         // --- 新增：格式审查状态存取 ---
         saveFormatValidationState() {
             try {
                 localStorage.setItem('guixu_format_validation_enabled', this.isFormatValidationEnabled);
             } catch (e) {
                 console.error('保存格式审查状态失败:', e);
             }
         },
         loadFormatValidationState() {
             try {
                 const savedState = localStorage.getItem('guixu_format_validation_enabled');
                 // 默认为 true (开启)
                 this.isFormatValidationEnabled = savedState === null ? true : savedState === 'true';
                 const checkbox = document.getElementById('format-validation-enabled-checkbox');
                 if (checkbox) {
                     checkbox.checked = this.isFormatValidationEnabled;
                 }
             } catch (e) {
                 console.error('加载格式审查状态失败:', e);
                 this.isFormatValidationEnabled = true;
             }
         },

         // --- 新增：回车发送状态存取 ---
         saveEnterSendState() {
             try {
                 localStorage.setItem('guixu_enter_send_enabled', this.isEnterSendEnabled);
             } catch (e) {
                 console.error('保存回车发送状态失败:', e);
             }
         },
         loadEnterSendState() {
             try {
                 const savedState = localStorage.getItem('guixu_enter_send_enabled');
                 // 默认为 false (关闭)
                 this.isEnterSendEnabled = savedState === 'true';
                 const checkbox = document.getElementById('enter-send-checkbox');
                 if (checkbox) {
                     checkbox.checked = this.isEnterSendEnabled;
                 }
             } catch (e) {
                 console.error('加载回车发送状态失败:', e);
                 this.isEnterSendEnabled = false;
             }
         },

         // --- 新增：键盘快捷键状态存取 ---
         saveKeyboardShortcutsState() {
             try {
                 localStorage.setItem('guixu_keyboard_shortcuts_enabled', this.isKeyboardShortcutsEnabled);
             } catch (e) {
                 console.error('保存键盘快捷键状态失败:', e);
             }
         },
         loadKeyboardShortcutsState() {
             try {
                 const savedState = localStorage.getItem('guixu_keyboard_shortcuts_enabled');
                 // 默认为 true (开启)
                 this.isKeyboardShortcutsEnabled = savedState !== 'false';
                 const checkbox = document.getElementById('keyboard-shortcuts-checkbox');
                 if (checkbox) {
                     checkbox.checked = this.isKeyboardShortcutsEnabled;
                 }
             } catch (e) {
                 console.error('加载键盘快捷键状态失败:', e);
                 this.isKeyboardShortcutsEnabled = true;
             }
         },

         // --- 新增：手机输入框适配状态存取 ---
         saveMobileInputAdaptState() {
             try {
                 localStorage.setItem('guixu_mobile_input_adapt_enabled', this.isMobileInputAdaptEnabled);
             } catch (e) {
                 console.error('保存手机输入框适配状态失败:', e);
             }
         },
         loadMobileInputAdaptState() {
             try {
                 const savedState = localStorage.getItem('guixu_mobile_input_adapt_enabled');
                 // 默认为 false (关闭)
                 this.isMobileInputAdaptEnabled = savedState === 'true';
                 const checkbox = document.getElementById('mobile-input-adapt-checkbox');
                 if (checkbox) {
                     checkbox.checked = this.isMobileInputAdaptEnabled;
                 }
             } catch (e) {
                 console.error('加载手机输入框适配状态失败:', e);
                 this.isMobileInputAdaptEnabled = false;
             }
         },

         // --- 新增：历程修剪功能处理函数 ---
          reconstructJourneyEntry(events) {
            if (!Array.isArray(events)) return '';

            const fieldOrder = ['序号', '日期', '标题', '地点', '人物', '描述', '人物关系', '标签', '重要信息', '暗线与伏笔', '自动化系统'];

            return events.map(event => {
                return fieldOrder
                    .map(key => {
                        // 检查属性是否存在且不为null/undefined
                        if (event[key] !== undefined && event[key] !== null) {
                            return `${key}|${String(event[key]).trim()}`;
                        }
                        return null;
                    })
                    .filter(Boolean) // 过滤掉null或undefined的条目
                    .join('\n');
            }).join('\n\n');
          },

          async handlePreciseTrim() {
            // 1. 获取要操作的条目
            const checkedBoxes = document.querySelectorAll('#history-modal-body .journey-trim-checkbox:checked');
            if (checkedBoxes.length === 0) {
                this.showTemporaryMessage('请先在下方历程中勾选需要修剪的条目。');
                return;
            }
            const sequenceIdsToTrim = Array.from(checkedBoxes).map(box => box.dataset.sequenceId);

            // 2. 获取要删除的字段
            const fieldsToRemove = Array.from(document.querySelectorAll('.trim-field-checkbox:checked')).map(cb => cb.value);
            if (fieldsToRemove.length === 0) {
                this.showTemporaryMessage('请先在上方控制台勾选需要修剪的字段。');
                return;
            }

            // 3. 弹出确认框
            this.showCustomConfirm(
                `你确定要从选中的 ${checkedBoxes.length} 个条目中，删除【${fieldsToRemove.join('、')}】字段吗？此操作不可恢复。`,
                async () => {
                    this.showTemporaryMessage('正在进行精确修剪...');
                    const bookName = '1归墟';
                    const index = this.unifiedIndex;
                    const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';

                    try {
                        const allEntries = await TavernHelper.getLorebookEntries(bookName);
                        const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);

                        if (!journeyEntry || !journeyEntry.content) {
                            this.showTemporaryMessage('错误：找不到“本世历程”内容。');
                            return;
                        }

                        let events = this.parseJourneyEntry(journeyEntry.content);
                        let trimCount = 0;

                        events.forEach(event => {
                            if (sequenceIdsToTrim.includes(event['序号'])) {
                                let trimmedThisEvent = false;
                                fieldsToRemove.forEach(field => {
                                    if (event.hasOwnProperty(field)) {
                                        delete event[field];
                                        trimmedThisEvent = true;
                                    }
                                });
                                if (trimmedThisEvent) trimCount++;
                            }
                        });

                        if (trimCount === 0) {
                            this.showTemporaryMessage('选中的条目中没有可修剪的内容。');
                            return;
                        }

                        const newContent = this.reconstructJourneyEntry(events);
                        await TavernHelper.setLorebookEntries(bookName, [{ uid: journeyEntry.uid, content: newContent }]);
                        this.showTemporaryMessage(`修剪成功！已处理 ${trimCount} 个条目。`, 3000);
                        this.showJourney(); // 刷新视图

                    } catch (error) {
                        console.error('精确修剪失败:', error);
                        this.showTemporaryMessage(`修剪失败: ${error.message}`, 3000);
                    }
                },
                true // keepCurrentModal
            );
          },

          async handleAutoTrim() {
            // 1. 获取要删除的字段
            const fieldsToRemove = Array.from(document.querySelectorAll('.trim-field-checkbox:checked')).map(cb => cb.value);
            if (fieldsToRemove.length === 0) {
                this.showTemporaryMessage('请先在上方控制台勾选需要修剪的字段。');
                return;
            }

            // 2. 获取保留数量
            const keepCountInput = document.getElementById('trim-keep-count');
            const keepCount = parseInt(keepCountInput.value, 10);
            if (isNaN(keepCount) || keepCount < 0) {
                this.showTemporaryMessage('请输入有效的保留数量。');
                return;
            }

            // 3. 弹出确认框
            this.showCustomConfirm(
                `你确定要保留最新的 ${keepCount} 个条目，并从所有更早的条目中删除【${fieldsToRemove.join('、')}】字段吗？此操作不可恢复。`,
                async () => {
                    this.showTemporaryMessage('正在进行自动修剪...');
                    const bookName = '1归墟';
                    const index = this.unifiedIndex;
                    const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';

                    try {
                        const allEntries = await TavernHelper.getLorebookEntries(bookName);
                        const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);

                        if (!journeyEntry || !journeyEntry.content) {
                            this.showTemporaryMessage('错误：找不到“本世历程”内容。');
                            return;
                        }

                        let events = this.parseJourneyEntry(journeyEntry.content);
                        if (events.length <= keepCount) {
                            this.showTemporaryMessage('无需修剪，当前条目数未超过保留数量。');
                            return;
                        }

                        let trimCount = 0;
                        const eventsToTrimCount = events.length - keepCount;

                        events.forEach((event, idx) => {
                            if (idx < eventsToTrimCount) {
                                let trimmedThisEvent = false;
                                fieldsToRemove.forEach(field => {
                                    if (event.hasOwnProperty(field)) {
                                        delete event[field];
                                        trimmedThisEvent = true;
                                    }
                                });
                                if (trimmedThisEvent) trimCount++;
                            }
                        });

                        if (trimCount === 0) {
                            this.showTemporaryMessage('没有可修剪的内容。');
                            return;
                        }

                        const newContent = this.reconstructJourneyEntry(events);
                        await TavernHelper.setLorebookEntries(bookName, [{ uid: journeyEntry.uid, content: newContent }]);
                        this.showTemporaryMessage(`自动修剪成功！已处理 ${trimCount} 个旧条目。`, 3000);
                        this.showJourney();

                    } catch (error) {
                        console.error('自动修剪失败:', error);
                        this.showTemporaryMessage(`修剪失败: ${error.message}`, 3000);
                    }
                },
                true
            );
          },

          async handleFullTrim() {
            const keepCountInput = document.getElementById('trim-keep-count');
            const keepCount = parseInt(keepCountInput.value, 10);
            if (isNaN(keepCount) || keepCount < 0) {
                this.showTemporaryMessage('请输入有效的保留数量。');
                return;
            }

            this.showCustomConfirm(
                `【高危操作】你确定要永久删除除最近 ${keepCount} 条外的所有历程记录吗？此操作将彻底删除数据，不可恢复！`,
                async () => {
                    this.showTemporaryMessage('正在进行完整删除...');
                    const bookName = '1归墟';
                    const index = this.unifiedIndex;
                    const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';

                    try {
                        const allEntries = await TavernHelper.getLorebookEntries(bookName);
                        const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);

                        if (!journeyEntry || !journeyEntry.content) {
                            this.showTemporaryMessage('错误：找不到“本世历程”内容。');
                            return;
                        }

                        let events = this.parseJourneyEntry(journeyEntry.content);
                        if (events.length <= keepCount) {
                            this.showTemporaryMessage('无需删除，当前条目数未超过保留数量。');
                            return;
                        }

                        const deletedCount = events.length - keepCount;
                        const keptEvents = events.slice(deletedCount);
                        
                        const newContent = this.reconstructJourneyEntry(keptEvents);
                        await TavernHelper.setLorebookEntries(bookName, [{ uid: journeyEntry.uid, content: newContent }]);
                        this.showTemporaryMessage(`完整删除成功！已删除 ${deletedCount} 个旧条目。`, 3000);
                        this.showJourney();

                    } catch (error) {
                        console.error('完整删除失败:', error);
                        this.showTemporaryMessage(`删除失败: ${error.message}`, 3000);
                    }
                },
                true
            );
          },

          // --- 新增：修剪字段状态的保存与加载 ---
          saveTrimFieldsState() {
              const checkboxes = document.querySelectorAll('.trim-field-checkbox');
              const state = {};
              checkboxes.forEach(cb => {
                  state[cb.value] = cb.checked;
              });
              this.trimFieldsState = state;
              try {
                  localStorage.setItem('guixu_trim_fields_state', JSON.stringify(state));
              } catch (e) {
                  console.error('保存修剪字段状态失败:', e);
              }
          },

          loadTrimFieldsState() {
              try {
                  const savedState = localStorage.getItem('guixu_trim_fields_state');
                  if (savedState) {
                      this.trimFieldsState = JSON.parse(savedState);
                  } else {
                      // 如果没有保存的状态，则从HTML的默认checked状态初始化
                      this.saveTrimFieldsState();
                      return;
                  }
              } catch (e) {
                  console.error('加载修剪字段状态失败:', e);
                  this.trimFieldsState = {}; // 出错时重置
              }
              
              // 将加载的状态应用到复选框
              const checkboxes = document.querySelectorAll('.trim-field-checkbox');
              checkboxes.forEach(cb => {
                  // 如果状态对象中有这个值，则使用它；否则保持默认
                  if (this.trimFieldsState.hasOwnProperty(cb.value)) {
                      cb.checked = this.trimFieldsState[cb.value];
                  }
              });
           },

            // --- 新增：输入缓存历史功能 ---
            getInputHistory() {
                try {
                    const history = localStorage.getItem('guixu_input_history');
                    return history ? JSON.parse(history) : [];
                } catch (e) {
                    return [];
                }
            },

            saveInputToHistory(content) {
                if (!content) return;
                try {
                    let history = this.getInputHistory();
                    // 避免重复保存完全相同的内容到最前面
                    if (history[0] === content) return;
                    // 将新内容添加到数组开头
                    history.unshift(content);
                    // 限制历史记录数量，例如100条
                    if (history.length > 100) {
                        history.pop();
                    }
                    localStorage.setItem('guixu_input_history', JSON.stringify(history));
                } catch (e) {
                    // Fail silently
                }
            },

            showInputCacheModal() {
                const history = this.getInputHistory();
                const recentListEl = document.getElementById('recent-inputs-list');
                const allListEl = document.getElementById('all-inputs-list');

                if (!recentListEl || !allListEl) return;

                recentListEl.innerHTML = '';
                allListEl.innerHTML = '';

                if (history.length === 0) {
                    recentListEl.innerHTML = '<li class="empty-category-text">暂无记录</li>';
                    allListEl.innerHTML = '<li class="empty-category-text">暂无记录</li>';
                } else {
                    // 填充最近两次输入
                    history.slice(0, 2).forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'input-cache-item';
                        li.dataset.content = item;
                        li.innerHTML = `<span class="item-index">${index + 1}.</span>${item}`;
                        recentListEl.appendChild(li);
                    });

                    // 填充所有历史记录
                    history.forEach((item, index) => {
                        const li = document.createElement('li');
                        li.className = 'input-cache-item';
                        li.dataset.content = item;
                        li.innerHTML = `<span class="item-index">${index + 1}.</span>${item}`;
                        allListEl.appendChild(li);
                    });
                }
                
                this.openModal('input-cache-modal');
            },

            applyInputFromHistory(content) {
                const inputEl = document.getElementById('quick-send-input');
                if (inputEl) {
                    inputEl.value = content;
                    this.closeModal('input-cache-modal');
                    this.showTemporaryMessage('已应用历史输入。');
                }
            },

          // --- 新增：世界书管理功能 ---
          // 新增：显示分段记忆模态框
          async showSegmentedMemoryModal() {
            this.loadSegmentedMemoryCounts(); // 新增：加载保留数设置
            this.updateUnifiedSummaryDisplay(); // 在打开模态框时更新统一预览
            const modal = document.getElementById('segmented-memory-modal');
            if (!modal) {
                this.showTemporaryMessage('分段记忆模态框加载失败', 'error');
                return;
            }
            this.openModal('segmented-memory-modal', true); // 确保在设置之上

            // 更新统一预览
            this.updateUnifiedSummaryDisplay();

            // 初始化UI状态
            const autoGenerateCheckbox = document.getElementById('auto-segmented-memory-checkbox');
            if(autoGenerateCheckbox) autoGenerateCheckbox.checked = this.isSegmentedMemoryAutoGenerateEnabled; // 主开关的状态

            // 由于其他开关已移除，不再需要单独初始化它们

            // 绑定模态框内部事件
            const closeBtn = modal.querySelector('.modal-close-btn');
            closeBtn?.addEventListener('click', () => {
                this.closeModal('segmented-memory-modal');
                if (this.isFromSettingsModal) {
                    this.showSettings();
                    this.isFromSettingsModal = false; // 重置标志位
                }
            });
            
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.closeModal('segmented-memory-modal');
                    if (this.isFromSettingsModal) {
                        this.showSettings();
                        this.isFromSettingsModal = false; // 重置标志位
                    }
                }
            });

            const generateBtn = document.getElementById('btn-generate-segmented-memory');
            generateBtn?.addEventListener('click', async () => {
                // 依次调用三个生成函数
                await this.generateSegmentedMemory();
                await this.generateSmallSummary();
                await this.generateLargeSummary();

                // 在手动生成后，如果模态框是打开的，则刷新统一预览
                const modal = document.getElementById('segmented-memory-modal');
                if (modal && modal.style.display !== 'none') {
                    this.updateUnifiedSummaryDisplay();
                }
            });

            // 新增：为预览列表添加点击展开/折叠事件 (优化版)
            const displayEl = document.getElementById('unified-summary-display');
            if (displayEl && !displayEl.dataset.listenerAttached) {
                displayEl.dataset.listenerAttached = 'true';
                displayEl.addEventListener('click', (e) => {
                    const header = e.target.closest('.summary-header');
                    if (header) {
                        const item = header.closest('.summary-item');
                        item.classList.toggle('expanded');
                    }
                });
            }

            const segmentedCountInput = document.getElementById('segmented-memory-count');
            const smallSummaryCountInput = document.getElementById('small-summary-count');

            segmentedCountInput?.addEventListener('input', () => {
                this.updateUnifiedSummaryDisplay();
                this.saveSegmentedMemoryCounts();
            });
            smallSummaryCountInput?.addEventListener('input', () => {
                this.updateUnifiedSummaryDisplay();
                this.saveSegmentedMemoryCounts();
            });

            autoGenerateCheckbox?.addEventListener('change', (e) => {
               const isEnabled = e.target.checked;
               this.isSegmentedMemoryAutoGenerateEnabled = isEnabled;
               this.isSmallSummaryAutoOn = isEnabled;
               this.isLargeSummaryAutoOn = isEnabled;

               this.saveSegmentedMemoryState();
               this.saveSmallSummaryState();
               this.saveLargeSummaryState();

               this.showTemporaryMessage(`分段记忆自动生成已${isEnabled ? '开启' : '关闭'}`);

               if (isEnabled) {
                   this.startSegmentedMemoryPolling();
                   // 注意：小总结和大总结的轮询逻辑可能需要单独的计时器或在分段记忆轮询中触发
               } else {
                   this.stopSegmentedMemoryPolling();
                   // 同样需要停止小总结和大总结的轮询
               }
            });

            // --- 整合后的事件绑定 ---
            document.getElementById('edit-small-summary-btn')?.addEventListener('click', () => this.showSummaryEditorModal('small'));
            document.getElementById('edit-large-summary-btn')?.addEventListener('click', () => this.showSummaryEditorModal('large'));
const generateSummariesBtn = document.getElementById('btn-generate-summaries');
generateSummariesBtn?.addEventListener('click', async () => {
    const statusEl = document.getElementById('summaries-status');
    if (generateSummariesBtn) {
        generateSummariesBtn.disabled = true;
        generateSummariesBtn.textContent = '正在生成...';
    }
    
    try {
        await this.generateSmallSummary();
        await this.generateLargeSummary();
        if (statusEl) statusEl.textContent = '生成完成！';
        this.showTemporaryMessage('小结与总结已更新', 'success');
        // 生成后刷新统一预览
        this.updateUnifiedSummaryDisplay();
    } catch (e) {
        // 错误已在各自函数中处理和显示
    } finally {
        if (generateSummariesBtn) {
            generateSummariesBtn.disabled = false;
            generateSummariesBtn.textContent = '立即生成小结与总结';
        }
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
    }
});
},

// 旧的 updateSmallSummaryDisplay 和 updateLargeSummaryDisplay 函数已被移除


// --- 新增：总结编辑器 ---
async showSummaryEditorModal(summaryType) {
    const modal = document.getElementById('summary-editor-modal');
    const titleEl = document.getElementById('summary-editor-title');
    const textarea = document.getElementById('summary-editor-textarea');
    if (!modal || !titleEl || !textarea) return;

    const bookName = '1归墟';
    const index = this.unifiedIndex;
    const entryName = summaryType === 'small'
        ? (index > 1 ? `小总结(${index})` : '小总结')
        : (index > 1 ? `大总结(${index})` : '大总结');
    
    titleEl.textContent = `编辑${summaryType === 'small' ? '小总结' : '大总结'}`;
    textarea.value = '正在加载...';
    this.openModal('summary-editor-modal', true);

    try {
        const allEntries = await TavernHelper.getLorebookEntries(bookName);
        const entry = allEntries.find(e => e.comment === entryName);
        textarea.value = entry ? entry.content : '';
    } catch (error) {
        textarea.value = `加载失败: ${error.message}`;
    }

    // 绑定事件
    modal.querySelector('.modal-close-btn').onclick = () => this.closeModal('summary-editor-modal');
    modal.querySelector('#summary-editor-cancel').onclick = () => this.closeModal('summary-editor-modal');
    
    const saveBtn = modal.querySelector('#summary-editor-save');
    saveBtn.onclick = async () => {
        const newContent = textarea.value;
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;

        try {
            // 反向更新本世历程
            await this.updateJourneyFromSummary(newContent, summaryType);
            
            // 重新生成总结
            await this.generateSmallSummary();
            await this.generateLargeSummary();

            this.showTemporaryMessage('保存并更新成功！', 'success');
            this.closeModal('summary-editor-modal');

            // 刷新主模态框的显示
            this.updateSmallSummaryDisplay();
            this.updateLargeSummaryDisplay();

        } catch (error) {
            console.error('保存总结失败:', error);
            this.showTemporaryMessage(`保存失败: ${error.message}`, 'error');
        } finally {
            saveBtn.textContent = '保存更改';
            saveBtn.disabled = false;
        }
    };
},

async updateJourneyFromSummary(summaryContent, summaryType) {
    const bookName = '1归墟';
    const index = this.unifiedIndex;
    const journeyKey = index > 1 ? `本世历程(${index})` : '本世历程';
    
    const allEntries = await TavernHelper.getLorebookEntries(bookName);
    const journeyEntry = allEntries.find(entry => entry.comment === journeyKey);
    if (!journeyEntry) throw new Error('找不到“本世历程”世界书。');
    
    let journeyEvents = this.parseJourneyEntry(journeyEntry.content);
    const summaryEvents = summaryType === 'small'
        ? summaryContent.split('\n\n').filter(Boolean)
        : summaryContent.split('\n').filter(Boolean);

    if (journeyEvents.length < summaryEvents.length) {
        console.warn('总结中的事件数量多于本世历程，可能导致部分更新丢失。');
    }

    // 从后往前匹配和更新
    const journeyLen = journeyEvents.length;
    const summaryLen = summaryEvents.length;
    for (let i = 0; i < summaryLen; i++) {
        const journeyIndex = journeyLen - 1 - i;
        const summaryIndex = summaryLen - 1 - i;
        if (journeyIndex < 0) break;

        const journeyEvent = journeyEvents[journeyIndex];
        const summaryText = summaryEvents[summaryIndex];

        if (summaryType === 'small') {
            const lines = summaryText.split('\n');
            const firstLineContent = lines[0].replace(/^.+?，/, '').trim();
            journeyEvent['重要信息'] = firstLineContent;
            delete journeyEvent['暗线与伏笔'];
            delete journeyEvent['自动化系统'];
            lines.slice(1).forEach(line => {
                const parts = line.split('|');
                if (parts.length === 2) {
                    if (parts[0] === '暗线与伏笔') journeyEvent['暗线与伏笔'] = parts[1];
                    if (parts[0] === '自动化系统') journeyEvent['自动化系统'] = parts[1];
                }
            });
        } else { // large
            const contentWithoutDate = summaryText.replace(/^.+?，/, '').trim();
            journeyEvent['描述'] = contentWithoutDate;
        }
    }
    
    const newJourneyContent = this.reconstructJourneyEntry(journeyEvents);
    await TavernHelper.setLorebookEntries(bookName, [{ uid: journeyEntry.uid, content: newJourneyContent }]);
},
// 新增：更新分段记忆模态框中的章节显示
async updateUnifiedSummaryDisplay() {
    const displayEl = document.getElementById('unified-summary-display');
    if (!displayEl) return;

    displayEl.innerHTML = '<div style="color: #8b7355; text-align: center;">正在加载...</div>';

    try {
        const bookName = '1归墟';
        const currentIndex = this.unifiedIndex;

        // 1. 并行获取所有需要的数据源
        const entryNames = [
            currentIndex > 1 ? `本世历程(${currentIndex})` : '本世历程',
            currentIndex > 1 ? `分段正文(${currentIndex})` : '分段正文',
            currentIndex > 1 ? `小总结(${currentIndex})` : '小总结',
            currentIndex > 1 ? `大总结(${currentIndex})` : '大总结'
        ];

        const allEntries = await TavernHelper.getLorebookEntries(bookName);
        const [journeyEntry, segmentedEntry, smallSummaryEntry, largeSummaryEntry] = entryNames.map(name =>
            allEntries.find(entry => entry.comment === name)
        );

        if (!journeyEntry || !journeyEntry.content) {
            displayEl.innerHTML = '<div class="modal-display-placeholder">“本世历程”内容为空</div>';
            return;
        }

        const journeyEvents = this.parseJourneyEntry(journeyEntry.content);
        if (journeyEvents.length === 0) {
            displayEl.innerHTML = '<div class="modal-display-placeholder">无事件可供预览</div>';
            return;
        }

        // 2. 解析三大产物的内容
        const segmentedContent = segmentedEntry ? segmentedEntry.content.split('\n——\n') : [];
        const smallSummaryContent = smallSummaryEntry ? smallSummaryEntry.content.split('\n——\n') : [];
        const largeSummaryContent = largeSummaryEntry ? largeSummaryEntry.content.split('\n——\n') : [];

        const segmentedCount = parseInt(document.getElementById('segmented-memory-count').value, 10) || 0;
        const smallSummaryCount = parseInt(document.getElementById('small-summary-count').value, 10) || 0;

        const html = journeyEvents.map((event, index) => {
            const eventNumber = index + 1;
            let tag = '';
            let tagColor = '';
            let contentToShow = '<div class="summary-detail-placeholder">无对应内容</div>';

            // 3. 根据切片模型决定标签和要显示的内容
            if (eventNumber > journeyEvents.length - segmentedCount) {
                tag = '分段正文';
                tagColor = '#C9AA71';
                const contentIndex = index - (journeyEvents.length - segmentedCount);
                if (segmentedContent[contentIndex]) {
                    contentToShow = `<div class="summary-detail-content text-language">${_.escape(segmentedContent[contentIndex]).replace(/\n/g, '<br>')}</div>`;
                }
            } else if (eventNumber > journeyEvents.length - segmentedCount - smallSummaryCount) {
                tag = '小总结';
                tagColor = '#A9C971';
                const contentIndex = index - (journeyEvents.length - segmentedCount - smallSummaryCount);
                if (smallSummaryContent[contentIndex]) {
                    contentToShow = `<div class="summary-detail-content text-psychology">${_.escape(smallSummaryContent[contentIndex]).replace(/\n/g, '<br>')}</div>`;
                }
            } else {
                tag = '大总结';
                tagColor = '#71A9C9';
                const contentIndex = index;
                if (largeSummaryContent[contentIndex]) {
                    contentToShow = `<div class="summary-detail-content text-scenery">${_.escape(largeSummaryContent[contentIndex]).replace(/\n/g, '<br>')}</div>`;
                }
            }
            
            const chapterNumber = event['序号'] || eventNumber;
            const chapterTitle = event['标题'] || '无标题';
            const title = `第${chapterNumber}章 ${chapterTitle}`;

            // 4. 构建UI，内容默认展开
            return `
                <div class="summary-item">
                    <div class="summary-header">
                        <span class="summary-arrow">▶</span>
                        <span class="summary-title">${_.escape(title)}</span>
                        <span class="summary-tag" style="background-color: ${tagColor};">${tag}</span>
                    </div>
                    <div class="summary-details" style="display: none;">
                        ${contentToShow}
                    </div>
                </div>
            `;
        }).join('');

        displayEl.innerHTML = html;
    } catch (error) {
        console.error('更新分段记忆预览失败:', error);
        displayEl.innerHTML = `<div style="color: #ff6b6b; text-align: center;">加载失败: ${error.message}</div>`;
    }
},

          // 新增：生成/更新分段记忆的核心逻辑
          async generateSegmentedMemory(isPolling = false) {
            const statusEl = document.getElementById('segmented-memory-status');
            const countInput = document.getElementById('segmented-memory-count');
            const generateBtn = document.getElementById('btn-generate-segmented-memory');

            if (!statusEl || !countInput || !generateBtn) {
                this.showTemporaryMessage('UI元素缺失，操作中断', 'error');
                return;
            }

            try {
                if (!isPolling) {
                    generateBtn.disabled = true;
                    generateBtn.textContent = '正在生成...';
                    statusEl.textContent = '正在读取小说模式数据...';
                }

                const count = parseInt(countInput.value, 10);
                if (isNaN(count) || count < 0) {
                    throw new Error('请输入一个有效的非负整数');
                }

                const bookName = '1归墟';
                const allEntries = await TavernHelper.getLorebookEntries(bookName);

                if (!allEntries || allEntries.length === 0) {
                    throw new Error(`世界书 "${bookName}" 中没有条目。`);
                }

                // 根据当前读写序号，精确定位源“小说模式”条目
                const currentIndex = this.unifiedIndex;
                const sourceEntryName = currentIndex > 1 ? `小说模式(${currentIndex})` : '小说模式';
                const sourceEntry = allEntries.find(entry => entry.comment === sourceEntryName);

                if (!sourceEntry || !sourceEntry.content) {
                    throw new Error(`未找到或内容为空的源条目: "${sourceEntryName}"`);
                }

                // 使用正则表达式分割章节
                const chapters = sourceEntry.content.split(/(?=第\d+章\s+.*)/g).filter(c => c.trim() !== '');

                // 从章节末尾提取最新的X个
                // 修复：当count为0时，slice(0)会返回整个数组，而不是空数组
                const latestChapters = count === 0 ? [] : chapters.slice(-count);

                // 合并内容
                const combinedContent = latestChapters.join('\n——\n');

                if (!isPolling) {
                    statusEl.textContent = '正在写入“分段正文”...';
                }

                // 根据统一序号生成目标条目名称
                const targetEntryName = currentIndex > 1 ? `分段正文(${currentIndex})` : '分段正文';

                // 查找现有的“分段正文”条目
                const existingEntry = allEntries.find(entry => entry.comment === targetEntryName);

                if (existingEntry) {
                    // 仅在内容有变化时才更新，避免不必要的写入
                    if (existingEntry.content !== combinedContent) {
                        await TavernHelper.setLorebookEntries(bookName, [{
                            uid: existingEntry.uid,
                            content: combinedContent,
                        }]);
                    }
                } else {
                    // 创建新条目
                    await TavernHelper.createLorebookEntries(bookName, [{
                        comment: targetEntryName,
                        content: combinedContent,
                        keys: [], // 作为一个常量条目，不需要关键词
                        type: 'constant',
                        enabled: true,
                    }]);
                }

                const successMsg = `分段记忆已更新，共聚合 ${latestChapters.length} 个最新章节。`;
                if (!isPolling) {
                    statusEl.textContent = successMsg;
                    this.showTemporaryMessage(successMsg, 'success');
                } else {
                    console.log(`[归墟-分段记忆] 自动更新成功，聚合 ${latestChapters.length} 个章节。`);
                }

                // 新增：如果分段记忆窗口是打开的，则静默刷新章节列表显示
                const modal = document.getElementById('segmented-memory-modal');
                if (modal && modal.style.display !== 'none') {
                    this.updateUnifiedSummaryDisplay();
                }

            } catch (error) {
                console.error('生成分段记忆时出错:', error);
                if (!isPolling) {
                    const errorMsg = `错误: ${error.message}`;
                    statusEl.textContent = errorMsg;
                    this.showTemporaryMessage(errorMsg, 'error', 5000);
                }
            } finally {
                if (!isPolling) {
                    generateBtn.disabled = false;
                    generateBtn.textContent = '立即生成/更新';
                }
            }
          },

          // 新增：生成/更新小总结的核心逻辑
          async generateSmallSummary(isPolling = false) {
            const statusEl = document.getElementById('segmented-memory-status');
            const smallSummaryCountInput = document.getElementById('small-summary-count');
            const segmentedCountInput = document.getElementById('segmented-memory-count'); // 获取分段正文的数量输入框

            if (!smallSummaryCountInput || !segmentedCountInput) {
                this.showTemporaryMessage('UI元素缺失，操作中断', 'error');
                return;
            }

            try {
                if (!isPolling && statusEl) {
                    statusEl.textContent = '正在读取(小总结)...';
                }

                const smallSummaryCount = parseInt(smallSummaryCountInput.value, 10);
                const segmentedCount = parseInt(segmentedCountInput.value, 10); // 获取分段正文的数量

                if (isNaN(smallSummaryCount) || smallSummaryCount < 0 || isNaN(segmentedCount) || segmentedCount < 0) {
                    throw new Error('请输入一个有效的非负整数');
                }

                const bookName = '1归墟';
                const allEntries = await TavernHelper.getLorebookEntries(bookName);

                if (!allEntries || allEntries.length === 0) {
                    throw new Error(`世界书 "${bookName}" 中没有条目。`);
                }

                const currentIndex = this.unifiedIndex;
                const sourceEntryName = currentIndex > 1 ? `本世历程(${currentIndex})` : '本世历程';
                const sourceEntry = allEntries.find(entry => entry.comment === sourceEntryName);

                if (!sourceEntry || !sourceEntry.content) {
                    throw new Error(`未找到或内容为空的源条目: "${sourceEntryName}"`);
                }

                const journeyEvents = this.parseJourneyEntry(sourceEntry.content);
                
                // 新的切片逻辑
                const start = -(segmentedCount + smallSummaryCount);
                const end = -segmentedCount;
                const latestEvents = smallSummaryCount === 0 ? [] : journeyEvents.slice(start, end < 0 ? end : undefined);


                const formattedEvents = latestEvents.map(event => {
                    const parts = [];
                    // 格式：xxx（日期），xxx（重要信息）
                    if (event['日期'] && event['重要信息']) {
                        parts.push(`${event['日期']}，${event['重要信息']}`);
                    } else if (event['日期']) {
                        parts.push(event['日期']);
                    } else if (event['重要信息']) {
                        parts.push(event['重要信息']);
                    }

                    // 格式：暗线与伏笔|xxx
                    if (event['暗线与伏笔']) {
                        parts.push(`暗线与伏笔|${event['暗线与伏笔']}`);
                    }
                    // 格式：自动化系统|xxx
                    if (event['自动化系统']) {
                        parts.push(`自动化系统|${event['自动化系统']}`);
                    }
                    return parts.join('\n');
                }).filter(Boolean); // 过滤掉可能为空的事件字符串
                const combinedContent = formattedEvents.join('\n——\n'); // 使用新的分隔符
                
                if (!isPolling) {
                    statusEl.textContent = '正在写入“小总结”...';
                }

                const targetEntryName = currentIndex > 1 ? `小总结(${currentIndex})` : '小总结';
                const existingEntry = allEntries.find(entry => entry.comment === targetEntryName);

                if (existingEntry) {
                    if (existingEntry.content !== combinedContent) {
                        await TavernHelper.setLorebookEntries(bookName, [{ uid: existingEntry.uid, content: combinedContent }]);
                    }
                } else {
                    await TavernHelper.createLorebookEntries(bookName, [{
                        comment: targetEntryName,
                        content: combinedContent,
                        keys: [],
                        type: 'constant',
                        enabled: true,
                    }]);
                }

                const successMsg = `小总结已更新，共聚合 ${latestEvents.length} 个最新事件。`;
                if (!isPolling) {
                    statusEl.textContent = successMsg;
                    this.showTemporaryMessage(successMsg, 'success');
                } else {
                    console.log(`[归墟-小总结] 自动更新成功，聚合 ${latestEvents.length} 个事件。`);
                }

            } catch (error) {
                console.error('生成小总结时出错:', error);
                if (!isPolling) {
                    const errorMsg = `错误: ${error.message}`;
                    statusEl.textContent = errorMsg;
                    this.showTemporaryMessage(errorMsg, 'error', 5000);
                }
            } finally {
                // 按钮状态管理已移至调用处
            }
          },

          // 新增：生成/更新大总结的核心逻辑
          async generateLargeSummary(isPolling = false) {
            const statusEl = document.getElementById('segmented-memory-status');
            const smallSummaryCountInput = document.getElementById('small-summary-count');
            const segmentedCountInput = document.getElementById('segmented-memory-count');

            try {
                if (!isPolling && statusEl) {
                    statusEl.textContent = '正在读取(大总结)...';
                }

                const smallSummaryCount = parseInt(smallSummaryCountInput.value, 10);
                const segmentedCount = parseInt(segmentedCountInput.value, 10);

                if (isNaN(smallSummaryCount) || smallSummaryCount < 0 || isNaN(segmentedCount) || segmentedCount < 0) {
                    throw new Error('获取的数值无效');
                }

                const bookName = '1归墟';
                const allEntries = await TavernHelper.getLorebookEntries(bookName);

                if (!allEntries || allEntries.length === 0) {
                    throw new Error(`世界书 "${bookName}" 中没有条目。`);
                }

                const currentIndex = this.unifiedIndex;
                const sourceEntryName = currentIndex > 1 ? `本世历程(${currentIndex})` : '本世历程';
                const sourceEntry = allEntries.find(entry => entry.comment === sourceEntryName);

                if (!sourceEntry || !sourceEntry.content) {
                    throw new Error(`未找到或内容为空的源条目: "${sourceEntryName}"`);
                }

                const journeyEvents = this.parseJourneyEntry(sourceEntry.content);
                
                // 新的切片逻辑
                const end = -(segmentedCount + smallSummaryCount);
                const largeSummaryEvents = journeyEvents.slice(0, end < 0 ? end : undefined);

                const formattedEvents = largeSummaryEvents.map(event => {
                    // 格式：xxx（日期），xxx（描述）
                    if (event['日期'] && event['描述']) {
                        return `${event['日期']}，${event['描述']}`;
                    }
                    return null; // 如果缺少任一字段，则忽略此事件
                }).filter(Boolean); // 过滤掉为null的事件
                const combinedContent = formattedEvents.join('\n——\n'); // 使用新的分隔符
                
                if (!isPolling) {
                    statusEl.textContent = '正在写入“大总结”...';
                }

                const targetEntryName = currentIndex > 1 ? `大总结(${currentIndex})` : '大总结';
                const existingEntry = allEntries.find(entry => entry.comment === targetEntryName);

                if (existingEntry) {
                    if (existingEntry.content !== combinedContent) {
                        await TavernHelper.setLorebookEntries(bookName, [{ uid: existingEntry.uid, content: combinedContent }]);
                    }
                } else {
                    await TavernHelper.createLorebookEntries(bookName, [{
                        comment: targetEntryName,
                        content: combinedContent,
                        keys: [],
                        type: 'constant',
                        enabled: true,
                    }]);
                }

                const successMsg = `大总结已更新，共聚合 ${journeyEvents.length} 个事件。`;
                if (!isPolling) {
                    statusEl.textContent = successMsg;
                    this.showTemporaryMessage(successMsg, 'success');
                } else {
                    console.log(`[归墟-大总结] 自动更新成功，聚合 ${journeyEvents.length} 个事件。`);
                }

            } catch (error) {
                console.error('生成大总结时出错:', error);
                if (!isPolling) {
                    const errorMsg = `错误: ${error.message}`;
                    statusEl.textContent = errorMsg;
                    this.showTemporaryMessage(errorMsg, 'error', 5000);
                }
            } finally {
                // 按钮状态管理已移至调用处
            }
          },

          // --- 新增：分段记忆自动生成相关 ---
          startSegmentedMemoryPolling() {
              this.stopSegmentedMemoryPolling();
              console.log('[归墟] 启动分段记忆统一自动生成轮询...');
              this.segmentedMemoryIntervalId = setInterval(async () => {
                  console.log('[归墟] 轮询触发：开始自动更新分段记忆...');
                  await this.generateSegmentedMemory(true);
                  if (this.isSmallSummaryAutoOn) {
                      console.log('[归墟] 轮询触发：开始自动更新小总结...');
                      await this.generateSmallSummary(true);
                  }
                  if (this.isLargeSummaryAutoOn) {
                      console.log('[归墟] 轮询触发：开始自动更新大总结...');
                      await this.generateLargeSummary(true);
                  }
                  console.log('[归墟] 轮询更新完成。');
              }, 60000); // 每60秒检查一次
          },

          stopSegmentedMemoryPolling() {
              if (this.segmentedMemoryIntervalId) {
                  console.log('[归墟] 停止分段记忆统一自动生成轮询。');
                  clearInterval(this.segmentedMemoryIntervalId);
                  this.segmentedMemoryIntervalId = null;
              }
          },

          saveSegmentedMemoryState() {
              try {
                  localStorage.setItem('guixu_segmented_memory_enabled', this.isSegmentedMemoryAutoGenerateEnabled);
              } catch (e) {
                  console.error('保存分段记忆状态失败:', e);
              }
          },

          loadSegmentedMemoryState() {
              try {
                  const savedState = localStorage.getItem('guixu_segmented_memory_enabled');
                  this.isSegmentedMemoryAutoGenerateEnabled = savedState === 'true';
                  if (this.isSegmentedMemoryAutoGenerateEnabled) {
                      this.startSegmentedMemoryPolling();
                  }
              } catch (e) {
                  console.error('加载分段记忆状态失败:', e);
                  this.isSegmentedMemoryAutoGenerateEnabled = false;
              }
          },

          saveSmallSummaryState() {
              try {
                  localStorage.setItem('guixu_small_summary_enabled', this.isSmallSummaryAutoOn);
              } catch (e) {
                  console.error('保存小总结状态失败:', e);
              }
          },

          // --- 新增：分段记忆保留数存取 ---
          saveSegmentedMemoryCounts() {
              try {
                  const segmentedCount = document.getElementById('segmented-memory-count')?.value || '3';
                  const smallSummaryCount = document.getElementById('small-summary-count')?.value || '25';
                  localStorage.setItem('guixu_segmented_memory_count', segmentedCount);
                  localStorage.setItem('guixu_small_summary_count', smallSummaryCount);
              } catch (e) {
                  console.error('保存分段记忆保留数失败:', e);
              }
          },

          loadSegmentedMemoryCounts() {
              try {
                  const segmentedCount = localStorage.getItem('guixu_segmented_memory_count');
                  const smallSummaryCount = localStorage.getItem('guixu_small_summary_count');
                  
                  const segmentedCountInput = document.getElementById('segmented-memory-count');
                  if (segmentedCountInput && segmentedCount !== null) {
                      segmentedCountInput.value = segmentedCount;
                  }

                  const smallSummaryCountInput = document.getElementById('small-summary-count');
                  if (smallSummaryCountInput && smallSummaryCount !== null) {
                      smallSummaryCountInput.value = smallSummaryCount;
                  }
              } catch (e) {
                  console.error('加载分段记忆保留数失败:', e);
              }
          },

          // --- 新增：分段记忆保留数存取 ---
          saveSegmentedMemoryCounts() {
              try {
                  const segmentedCount = document.getElementById('segmented-memory-count')?.value || '3';
                  const smallSummaryCount = document.getElementById('small-summary-count')?.value || '25';
                  localStorage.setItem('guixu_segmented_memory_count', segmentedCount);
                  localStorage.setItem('guixu_small_summary_count', smallSummaryCount);
              } catch (e) {
                  console.error('保存分段记忆保留数失败:', e);
              }
          },

          loadSegmentedMemoryCounts() {
              try {
                  const segmentedCount = localStorage.getItem('guixu_segmented_memory_count');
                  const smallSummaryCount = localStorage.getItem('guixu_small_summary_count');
                  
                  const segmentedCountInput = document.getElementById('segmented-memory-count');
                  if (segmentedCountInput && segmentedCount !== null) {
                      segmentedCountInput.value = segmentedCount;
                  }

                  const smallSummaryCountInput = document.getElementById('small-summary-count');
                  if (smallSummaryCountInput && smallSummaryCount !== null) {
                      smallSummaryCountInput.value = smallSummaryCount;
                  }
              } catch (e) {
                  console.error('加载分段记忆保留数失败:', e);
              }
          },

          loadSmallSummaryState() {
              try {
                  const savedState = localStorage.getItem('guixu_small_summary_enabled');
                  this.isSmallSummaryAutoOn = savedState === 'true';
              } catch (e) {
                  console.error('加载小总结状态失败:', e);
                  this.isSmallSummaryAutoOn = false;
              }
          },

          saveLargeSummaryState() {
              try {
                  localStorage.setItem('guixu_large_summary_enabled', this.isLargeSummaryAutoOn);
              } catch (e) {
                  console.error('保存大总结状态失败:', e);
              }
          },

          loadLargeSummaryState() {
              try {
                  const savedState = localStorage.getItem('guixu_large_summary_enabled');
                  this.isLargeSummaryAutoOn = savedState === 'true';
              } catch (e) {
                  console.error('加载大总结状态失败:', e);
                  this.isLargeSummaryAutoOn = false;
              }
          },

          // 显示世界书管理界面
          showWorldbookManager() {
            console.log('[世界书管理] 开始显示世界书管理界面');
            
            // 先打开模态框
            this.openModal('worldbook-manager-modal');
            
            // 检查模态框是否正确显示
            const modal = document.getElementById('worldbook-manager-modal');
            if (!modal) {
              console.error('[世界书管理] 找不到世界书管理模态框');
              this.showTemporaryMessage('世界书管理界面加载失败');
              return;
            }
            
            console.log('[世界书管理] 模态框显示状态:', modal.style.display);
            
            // 初始化界面状态
            this.worldbookManagerState = {
              allEntries: [],
              filteredEntries: [],
              currentFilter: 'all',
              currentPrefix: ''
            };
            
            // 延迟绑定事件监听器和加载数据，确保模态框已完全显示
            setTimeout(() => {
              console.log('[世界书管理] 开始绑定事件监听器');
              this.bindWorldbookManagerEvents();
              
              console.log('[世界书管理] 开始加载世界书条目');
              this.loadWorldbookEntries();
            }, 100);
          },

          // 加载世界书条目
          async loadWorldbookEntries() {
            console.log('[世界书管理] 开始加载世界书条目');
            
            const listContainer = document.getElementById('worldbook-entries-list');
            if (!listContainer) {
              console.error('[世界书管理] 找不到条目列表容器 worldbook-entries-list');
              return;
            }
            
            console.log('[世界书管理] 找到条目列表容器');
            
            try {
              listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #8b7355;"><div style="font-size: 24px; margin-bottom: 10px;">⏳</div>正在加载世界书条目...</div>';
              
              const bookName = '1归墟';
              console.log('[世界书管理] 开始调用 TavernHelper.getLorebookEntries，书名:', bookName);
              
              const entries = await TavernHelper.getLorebookEntries(bookName);
              console.log('[世界书管理] 获取到条目数量:', entries ? entries.length : 0);
              
              if (!entries || entries.length === 0) {
                console.log('[世界书管理] 没有找到世界书条目');
                listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #8b7355;"><div style="font-size: 48px; margin-bottom: 10px;">📚</div>暂无世界书条目</div>';
                this.updateWorldbookStats([], []);
                return;
              }
              
              // 保存所有条目
              this.worldbookManagerState.allEntries = entries;
              console.log('[世界书管理] 已保存条目到状态管理');
              
              // 应用当前筛选
              console.log('[世界书管理] 开始应用筛选');
              this.applyWorldbookFilter();
              
            } catch (error) {
              console.error('[世界书管理] 加载世界书条目失败:', error);
              listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;"><div style="font-size: 48px; margin-bottom: 10px;">❌</div>加载失败，请重试<br><small>错误: ' + error.message + '</small></div>';
              this.updateWorldbookStats([], []);
            }
          },

          // 应用筛选条件
          applyWorldbookFilter() {
            if (!this.worldbookManagerState) return;
            
            const filterType = document.getElementById('worldbook-filter-type')?.value || 'all';
            const prefixFilter = document.getElementById('worldbook-prefix-filter')?.value.trim() || '';
            
            let filtered = [...this.worldbookManagerState.allEntries];
            
            // 按类型筛选
            switch (filterType) {
              case 'journey':
                filtered = filtered.filter(entry =>
                  entry.comment && (entry.comment.includes('本世历程') || entry.comment.includes('历程'))
                );
                break;
              case 'pastlife':
                filtered = filtered.filter(entry =>
                  entry.comment && (entry.comment.includes('往世涟漪') || entry.comment.includes('涟漪'))
                );
                break;
              case 'bracket':
                filtered = filtered.filter(entry =>
                  entry.comment && entry.comment.includes('【') && entry.comment.includes('】')
                );
                break;
              case 'enabled':
                filtered = filtered.filter(entry => entry.enabled);
                break;
              case 'disabled':
                filtered = filtered.filter(entry => !entry.enabled);
                break;
              case 'all':
              default:
                // 不筛选
                break;
            }
            
            // 按前缀筛选
            if (prefixFilter) {
              filtered = filtered.filter(entry =>
                entry.comment && entry.comment.includes(prefixFilter)
              );
            }
            
            this.worldbookManagerState.filteredEntries = filtered;
            this.worldbookManagerState.currentFilter = filterType;
            this.worldbookManagerState.currentPrefix = prefixFilter;
            
            // 渲染筛选后的条目
            this.renderWorldbookEntries(filtered);
            
            // 更新统计信息
            this.updateWorldbookStats(this.worldbookManagerState.allEntries, filtered);
          },

          // 更新统计信息
          updateWorldbookStats(allEntries, filteredEntries) {
            const totalCount = allEntries.length;
            const enabledCount = allEntries.filter(e => e.enabled).length;
            const disabledCount = totalCount - enabledCount;
            const filteredCount = filteredEntries.length;
            
            document.getElementById('stats-total').textContent = totalCount;
            document.getElementById('stats-enabled').textContent = enabledCount;
            document.getElementById('stats-disabled').textContent = disabledCount;
            document.getElementById('stats-filtered').textContent = filteredCount;
          },

          // 渲染世界书条目列表
          renderWorldbookEntries(entries) {
            const listContainer = document.getElementById('worldbook-entries-list');
            if (!listContainer) return;
            
            if (!entries || entries.length === 0) {
              listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #8b7355;"><div style="font-size: 48px; margin-bottom: 10px;">🔍</div>没有符合筛选条件的条目</div>';
              return;
            }
            
            listContainer.innerHTML = '';
            
            entries.forEach((entry, index) => {
              const entryDiv = document.createElement('div');
              entryDiv.className = 'worldbook-entry-item';
              entryDiv.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                margin: 8px;
                background: rgba(26, 26, 46, 0.4);
                border-radius: 6px;
                border: 1px solid ${entry.enabled ? '#4a9eff' : '#8b7355'};
                transition: all 0.2s ease;
              `;
              
              // 鼠标悬浮效果
              entryDiv.addEventListener('mouseenter', () => {
                entryDiv.style.background = 'rgba(26, 26, 46, 0.6)';
                entryDiv.style.borderColor = entry.enabled ? '#5ba0ff' : '#c9aa71';
              });
              entryDiv.addEventListener('mouseleave', () => {
                entryDiv.style.background = 'rgba(26, 26, 46, 0.4)';
                entryDiv.style.borderColor = entry.enabled ? '#4a9eff' : '#8b7355';
              });
              
              // 左侧信息区域
              const infoDiv = document.createElement('div');
              infoDiv.style.cssText = 'flex: 1; min-width: 0; margin-right: 15px;';
              
              // 序号和标题
              const titleDiv = document.createElement('div');
              titleDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 4px;';
              
              const indexSpan = document.createElement('span');
              indexSpan.style.cssText = `
                display: inline-block;
                width: 30px;
                height: 20px;
                line-height: 20px;
                text-align: center;
                background: ${entry.enabled ? '#4a9eff' : '#8b7355'};
                color: white;
                font-size: 10px;
                border-radius: 10px;
                margin-right: 8px;
                font-weight: bold;
              `;
              indexSpan.textContent = (index + 1).toString();
              
              const titleSpan = document.createElement('span');
              titleSpan.style.cssText = `
                color: ${entry.enabled ? '#4a9eff' : '#c9aa71'};
                font-size: 13px;
                font-weight: bold;
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `;
              titleSpan.textContent = entry.comment || '未命名条目';
              titleSpan.title = entry.comment || '未命名条目';
              
              titleDiv.appendChild(indexSpan);
              titleDiv.appendChild(titleSpan);
              
              // 状态和类型信息
              const metaDiv = document.createElement('div');
              metaDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';
              
              const statusSpan = document.createElement('span');
              statusSpan.style.cssText = `
                color: ${entry.enabled ? '#90ee90' : '#ff6b6b'};
                font-size: 11px;
                font-weight: bold;
              `;
              statusSpan.textContent = entry.enabled ? '✓ 已启用' : '✗ 已禁用';
              
              // 条目类型标签
              const typeSpan = document.createElement('span');
              let typeText = '普通';
              let typeColor = '#888';
              
              if (entry.comment) {
                if (entry.comment.includes('本世历程') || entry.comment.includes('历程')) {
                  typeText = '本世历程';
                  typeColor = '#007bff';
                } else if (entry.comment.includes('往世涟漪') || entry.comment.includes('涟漪')) {
                  typeText = '往世涟漪';
                  typeColor = '#9932cc';
                } else if (entry.comment.includes('【') && entry.comment.includes('】')) {
                  const match = entry.comment.match(/【([^】]+)】/);
                  if (match) {
                    typeText = `【${match[1]}】`;
                    typeColor = '#28a745';
                  }
                }
              }
              
              typeSpan.style.cssText = `
                background: rgba(${typeColor === '#007bff' ? '0, 123, 255' :
                                  typeColor === '#9932cc' ? '153, 50, 204' :
                                  typeColor === '#28a745' ? '40, 167, 69' : '136, 136, 136'}, 0.2);
                color: ${typeColor};
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                border: 1px solid ${typeColor};
              `;
              typeSpan.textContent = typeText;
              
              metaDiv.appendChild(statusSpan);
              metaDiv.appendChild(typeSpan);
              
              infoDiv.appendChild(titleDiv);
              infoDiv.appendChild(metaDiv);
              
              // 右侧操作按钮区域
              const actionsDiv = document.createElement('div');
              actionsDiv.style.cssText = 'display: flex; gap: 6px; flex-shrink: 0;';
              
              // 开启/关闭按钮
              const toggleBtn = document.createElement('button');
              toggleBtn.className = 'interaction-btn';
              toggleBtn.style.cssText = `
                padding: 4px 8px;
                font-size: 11px;
                border: 1px solid ${entry.enabled ? '#ff6b6b' : '#90ee90'};
                background: ${entry.enabled ? 'rgba(255, 107, 107, 0.2)' : 'rgba(144, 238, 144, 0.2)'};
                color: ${entry.enabled ? '#ff6b6b' : '#90ee90'};
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
              `;
              toggleBtn.textContent = entry.enabled ? '关闭' : '开启';
              toggleBtn.onclick = () => this.toggleWorldbookEntry(entry.uid, !entry.enabled);
              
              // 删除按钮
              const deleteBtn = document.createElement('button');
              deleteBtn.className = 'interaction-btn';
              deleteBtn.style.cssText = `
                padding: 4px 8px;
                font-size: 11px;
                border: 1px solid #ff6b6b;
                background: rgba(255, 107, 107, 0.2);
                color: #ff6b6b;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
              `;
              deleteBtn.textContent = '删除';
              deleteBtn.onclick = () => this.deleteWorldbookEntry(entry.uid, entry.comment);
              
              actionsDiv.appendChild(toggleBtn);
              actionsDiv.appendChild(deleteBtn);
              
              entryDiv.appendChild(infoDiv);
              entryDiv.appendChild(actionsDiv);
              
              listContainer.appendChild(entryDiv);
            });
          },

          // 批量启用筛选项
          async enableFilteredEntries() {
            if (!this.worldbookManagerState?.filteredEntries) return;
            
            const entries = this.worldbookManagerState.filteredEntries.filter(e => !e.enabled);
            if (entries.length === 0) {
              this.showTemporaryMessage('没有需要启用的条目');
              return;
            }

            this.showConfirmModal(
              '批量启用确认',
              `确定要启用 ${entries.length} 个条目吗？`,
              async () => {
                try {
                  const bookName = '1归墟';
                  const updates = entries.map(entry => ({ uid: entry.uid, enabled: true }));
                  await TavernHelper.setLorebookEntries(bookName, updates);
                  this.showTemporaryMessage(`已启用 ${entries.length} 个条目`);
                  this.loadWorldbookEntries();
                } catch (error) {
                  console.error('批量启用失败:', error);
                  this.showTemporaryMessage('批量启用失败，请重试');
                }
              }
            );
          },

          // 批量禁用筛选项
          async disableFilteredEntries() {
            if (!this.worldbookManagerState?.filteredEntries) return;
            
            const entries = this.worldbookManagerState.filteredEntries.filter(e => e.enabled);
            if (entries.length === 0) {
              this.showTemporaryMessage('没有需要禁用的条目');
              return;
            }
            
            this.showConfirmModal(
              '批量禁用确认',
              `确定要禁用 ${entries.length} 个条目吗？`,
              async () => {
                try {
                  const bookName = '1归墟';
                  const updates = entries.map(entry => ({ uid: entry.uid, enabled: false }));
                  await TavernHelper.setLorebookEntries(bookName, updates);
                  this.showTemporaryMessage(`已禁用 ${entries.length} 个条目`);
                  this.loadWorldbookEntries();
                } catch (error) {
                  console.error('批量禁用失败:', error);
                  this.showTemporaryMessage('批量禁用失败，请重试');
                }
              }
            );
          },

          // 显示删除确认模态框
          showDeleteConfirmModal(deleteType, deleteData) {
            // 存储删除相关数据
            this.deleteConfirmState = {
              type: deleteType, // 'single' 或 'batch'
              data: deleteData, // 单个条目的 {uid, comment} 或批量条目数组
              step: 1 // 当前确认步骤
            };

            // 更新模态框内容
            this.updateDeleteConfirmContent();
            
            // 显示模态框
            this.openModal('worldbook-delete-confirm-modal');
            
            // 绑定事件监听器
            setTimeout(() => {
              this.bindDeleteConfirmEvents();
            }, 100);
          },

          // 更新删除确认模态框内容
          updateDeleteConfirmContent() {
            const state = this.deleteConfirmState;
            if (!state) return;

            // 使用现有HTML结构中的元素ID
            const step1El = document.getElementById('delete-step-1');
            const step2El = document.getElementById('delete-step-2');
            const deleteItemDetailsEl = document.getElementById('delete-item-details');
            const confirmationInputEl = document.getElementById('delete-confirmation-input');

            if (!step1El || !step2El) {
              console.error('删除确认模态框元素未找到');
              return;
            }

            if (state.step === 1) {
              // 显示第一步
              step1El.style.display = 'block';
              step2El.style.display = 'none';
              
              if (deleteItemDetailsEl) {
                if (state.type === 'single') {
                  const { comment } = state.data;
                  deleteItemDetailsEl.innerHTML = `单个条目: <strong>"${comment}"</strong>`;
                } else if (state.type === 'batch') {
                  const entries = state.data;
                  deleteItemDetailsEl.innerHTML = `批量删除: <strong>${entries.length} 个条目</strong>`;
                }
              }
            } else {
              // 显示第二步
              step1El.style.display = 'none';
              step2El.style.display = 'block';
              
              // 清空输入框
              if (confirmationInputEl) {
                confirmationInputEl.value = '';
              }
            }
          },

          // 处理删除确认的下一步
          proceedDeleteConfirm() {
            if (!this.deleteConfirmState) return;

            if (this.deleteConfirmState.step === 1) {
              // 进入第二步确认
              this.deleteConfirmState.step = 2;
              this.updateDeleteConfirmContent();
            }
          },

          // 执行最终删除操作
          async executeDelete() {
            const state = this.deleteConfirmState;
            if (!state || state.step !== 2) return;

            // 临时阻止自动返回设置界面
            const originalFromSettings = this.isFromSettingsModal;
            this.isFromSettingsModal = false;

            // 验证输入 - 使用正确的元素ID
            const inputEl = document.getElementById('delete-confirmation-input');
            if (!inputEl) {
              console.error('删除确认输入框未找到');
              return;
            }
            
            const input = inputEl.value.trim();
            if (input !== '确认删除') {
              this.showTemporaryMessage('输入不正确，请输入"确认删除"');
              // 显示错误提示
              const errorEl = document.getElementById('delete-input-error');
              if (errorEl) {
                errorEl.style.display = 'block';
                setTimeout(() => {
                  errorEl.style.display = 'none';
                }, 3000);
              }
              // 恢复原始状态
              this.isFromSettingsModal = originalFromSettings;
              return;
            }

            try {
              const bookName = '1归墟';
              
              // 在删除前获取完整的条目数据用于缓存
              let entriesToCache = [];
              
              if (state.type === 'single') {
                const { uid } = state.data;
                // 从当前加载的条目中找到完整数据
                const fullEntry = this.worldbookManagerState?.allEntries?.find(entry => entry.uid === uid);
                if (fullEntry) {
                  entriesToCache = [fullEntry];
                }
                await TavernHelper.deleteLorebookEntries(bookName, [uid]);
                this.showTemporaryMessage('世界书条目已删除');
              } else if (state.type === 'batch') {
                const uids = state.data.map(entry => entry.uid);
                // 获取所有要删除条目的完整数据
                entriesToCache = state.data.slice(); // 复制数组
                await TavernHelper.deleteLorebookEntries(bookName, uids);
                this.showTemporaryMessage(`已删除 ${state.data.length} 个条目`);
              }

              // 将删除的条目添加到缓存
              if (entriesToCache.length > 0) {
                this.addToDeleteCache(entriesToCache, state.type);
              }

              // 关闭确认模态框
              this.closeModal('worldbook-delete-confirm-modal');
              this.deleteConfirmState = null;
              
              // 刷新世界书列表
              this.loadWorldbookEntries();
              
              // 恢复原始的isFromSettingsModal状态
              this.isFromSettingsModal = originalFromSettings;
              
            } catch (error) {
              console.error('删除操作失败:', error);
              this.showTemporaryMessage('删除失败，请重试');
              // 恢复原始状态
              this.isFromSettingsModal = originalFromSettings;
            }
          },

          // 取消删除操作
          cancelDelete() {
            this.closeModal('worldbook-delete-confirm-modal');
            this.deleteConfirmState = null;
            this.showTemporaryMessage('删除操作已取消');
            // 返回到世界书管理界面
            this.showWorldbookManager();
          },

          // --- 删除缓存管理功能 ---
          
          // 添加条目到删除缓存
          addToDeleteCache(entries, deleteType) {
            try {
              // 获取现有缓存
              let deleteCache = this.getDeleteCache();
              
              // 创建缓存条目
              const cacheEntry = {
                id: Date.now() + Math.random(), // 唯一ID
                timestamp: new Date().toISOString(),
                type: deleteType, // 'single' 或 'batch'
                count: entries.length,
                entries: entries.map(entry => {
                  // 保存完整的条目数据以确保无损恢复，使用正确的API字段结构
                  const savedEntry = { ...entry }; // 完整复制原始条目
                  
                  // 确保关键字段存在
                  if (!savedEntry.keys) savedEntry.keys = [];
                  if (!savedEntry.filters) savedEntry.filters = [];
                  if (typeof savedEntry.enabled !== 'boolean') savedEntry.enabled = true;
                  if (!savedEntry.type) savedEntry.type = 'selective';
                  if (!savedEntry.position) savedEntry.position = 'after_character_definition';
                  if (!savedEntry.logic) savedEntry.logic = 'and_any';
                  if (typeof savedEntry.probability !== 'number') savedEntry.probability = 100;
                  if (typeof savedEntry.order !== 'number') savedEntry.order = 0;
                  
                  // 确保扫描和匹配设置存在
                  if (savedEntry.scan_depth === undefined) savedEntry.scan_depth = 'same_as_global';
                  if (savedEntry.case_sensitive === undefined) savedEntry.case_sensitive = 'same_as_global';
                  if (savedEntry.match_whole_words === undefined) savedEntry.match_whole_words = 'same_as_global';
                  if (savedEntry.use_group_scoring === undefined) savedEntry.use_group_scoring = 'same_as_global';
                  
                  // 确保递归控制字段存在
                  if (typeof savedEntry.exclude_recursion !== 'boolean') savedEntry.exclude_recursion = false;
                  if (typeof savedEntry.prevent_recursion !== 'boolean') savedEntry.prevent_recursion = false;
                  if (savedEntry.delay_until_recursion === undefined) savedEntry.delay_until_recursion = false;
                  
                  // 确保分组和其他高级字段存在
                  if (!savedEntry.group) savedEntry.group = '';
                  if (typeof savedEntry.group_prioritized !== 'boolean') savedEntry.group_prioritized = false;
                  if (typeof savedEntry.group_weight !== 'number') savedEntry.group_weight = 100;
                  
                  // 确保可为null的字段正确处理
                  if (savedEntry.sticky === undefined) savedEntry.sticky = null;
                  if (savedEntry.cooldown === undefined) savedEntry.cooldown = null;
                  if (savedEntry.delay === undefined) savedEntry.delay = null;
                  if (savedEntry.automation_id === undefined) savedEntry.automation_id = null;
                  if (savedEntry.depth === undefined) savedEntry.depth = null;
                  
                  // 确保基础字符串字段存在
                  if (!savedEntry.comment) savedEntry.comment = '';
                  if (!savedEntry.content) savedEntry.content = '';
                  
                  console.log('[删除缓存] 保存的完整字段:', Object.keys(savedEntry));
                  console.log('[删除缓存] 字段详情:', {
                    uid: savedEntry.uid,
                    display_index: savedEntry.display_index,
                    comment: savedEntry.comment,
                    enabled: savedEntry.enabled,
                    type: savedEntry.type,
                    position: savedEntry.position,
                    depth: savedEntry.depth,
                    order: savedEntry.order,
                    probability: savedEntry.probability,
                    keys: savedEntry.keys,
                    logic: savedEntry.logic,
                    filters: savedEntry.filters,
                    scan_depth: savedEntry.scan_depth,
                    case_sensitive: savedEntry.case_sensitive,
                    match_whole_words: savedEntry.match_whole_words,
                    use_group_scoring: savedEntry.use_group_scoring,
                    automation_id: savedEntry.automation_id,
                    exclude_recursion: savedEntry.exclude_recursion,
                    prevent_recursion: savedEntry.prevent_recursion,
                    delay_until_recursion: savedEntry.delay_until_recursion,
                    content: savedEntry.content,
                    group: savedEntry.group,
                    group_prioritized: savedEntry.group_prioritized,
                    group_weight: savedEntry.group_weight,
                    sticky: savedEntry.sticky,
                    cooldown: savedEntry.cooldown,
                    delay: savedEntry.delay
                  });
                  
                  return savedEntry;
                })
              };
              
              // 添加到缓存开头
              deleteCache.unshift(cacheEntry);
              
              // 保持最多10个缓存条目
              if (deleteCache.length > 10) {
                deleteCache = deleteCache.slice(0, 10);
              }
              
              // 保存到localStorage
              localStorage.setItem('guixu_worldbook_delete_cache', JSON.stringify(deleteCache));
              
              console.log(`[删除缓存] 已缓存 ${entries.length} 个条目，缓存总数: ${deleteCache.length}`);
              
            } catch (error) {
              console.error('保存删除缓存失败:', error);
            }
          },

          // 获取删除缓存
          getDeleteCache() {
            try {
              const cache = localStorage.getItem('guixu_worldbook_delete_cache');
              return cache ? JSON.parse(cache) : [];
            } catch (error) {
              console.error('读取删除缓存失败:', error);
              return [];
            }
          },

          // 从缓存中恢复条目
          async restoreFromCache(cacheId) {
            // 临时阻止自动返回设置界面
            const originalFromSettings = this.isFromSettingsModal;
            this.isFromSettingsModal = false;
            
            try {
              const deleteCache = this.getDeleteCache();
              const cacheEntry = deleteCache.find(entry => entry.id === cacheId);
              
              if (!cacheEntry) {
                this.showTemporaryMessage('缓存条目不存在');
                // 恢复原始状态
                this.isFromSettingsModal = originalFromSettings;
                return;
              }

              const bookName = '1归墟';
              
              console.log('[恢复缓存] 开始恢复条目:', cacheEntry);
              
              // 准备要恢复的条目数据，只移除uid和display_index让系统自动生成，保留所有其他字段
              const entriesToRestore = cacheEntry.entries.map(entry => {
                const newEntry = { ...entry }; // 完整复制缓存的条目数据
                
                // 只移除这两个字段，让API自动生成
                delete newEntry.uid;
                delete newEntry.display_index;
                
                // 验证所有API要求的字段都存在，确保数据完整性
                const requiredFields = [
                  'comment', 'enabled', 'type', 'position', 'depth', 'order', 'probability',
                  'keys', 'logic', 'filters', 'scan_depth', 'case_sensitive', 'match_whole_words',
                  'use_group_scoring', 'automation_id', 'exclude_recursion', 'prevent_recursion',
                  'delay_until_recursion', 'content', 'group', 'group_prioritized', 'group_weight',
                  'sticky', 'cooldown', 'delay'
                ];
                
                // 检查是否有缺失的字段
                const missingFields = requiredFields.filter(field => !(field in newEntry));
                if (missingFields.length > 0) {
                  console.warn('[恢复缓存] 发现缺失字段:', missingFields);
                }
                
                // 验证字段类型和值的正确性
                console.log('[恢复缓存] 恢复条目的完整字段验证:', {
                  comment: typeof newEntry.comment + ' = ' + JSON.stringify(newEntry.comment),
                  enabled: typeof newEntry.enabled + ' = ' + newEntry.enabled,
                  type: typeof newEntry.type + ' = ' + newEntry.type,
                  position: typeof newEntry.position + ' = ' + newEntry.position,
                  depth: typeof newEntry.depth + ' = ' + newEntry.depth,
                  order: typeof newEntry.order + ' = ' + newEntry.order,
                  probability: typeof newEntry.probability + ' = ' + newEntry.probability,
                  keys: Array.isArray(newEntry.keys) + ' = ' + JSON.stringify(newEntry.keys),
                  logic: typeof newEntry.logic + ' = ' + newEntry.logic,
                  filters: Array.isArray(newEntry.filters) + ' = ' + JSON.stringify(newEntry.filters),
                  scan_depth: typeof newEntry.scan_depth + ' = ' + newEntry.scan_depth,
                  case_sensitive: typeof newEntry.case_sensitive + ' = ' + newEntry.case_sensitive,
                  match_whole_words: typeof newEntry.match_whole_words + ' = ' + newEntry.match_whole_words,
                  use_group_scoring: typeof newEntry.use_group_scoring + ' = ' + newEntry.use_group_scoring,
                  automation_id: typeof newEntry.automation_id + ' = ' + newEntry.automation_id,
                  exclude_recursion: typeof newEntry.exclude_recursion + ' = ' + newEntry.exclude_recursion,
                  prevent_recursion: typeof newEntry.prevent_recursion + ' = ' + newEntry.prevent_recursion,
                  delay_until_recursion: typeof newEntry.delay_until_recursion + ' = ' + newEntry.delay_until_recursion,
                  content: typeof newEntry.content + ' = ' + JSON.stringify(newEntry.content?.substring(0, 50) + '...'),
                  group: typeof newEntry.group + ' = ' + JSON.stringify(newEntry.group),
                  group_prioritized: typeof newEntry.group_prioritized + ' = ' + newEntry.group_prioritized,
                  group_weight: typeof newEntry.group_weight + ' = ' + newEntry.group_weight,
                  sticky: typeof newEntry.sticky + ' = ' + newEntry.sticky,
                  cooldown: typeof newEntry.cooldown + ' = ' + newEntry.cooldown,
                  delay: typeof newEntry.delay + ' = ' + newEntry.delay
                });
                
                console.log('[恢复缓存] 恢复条目字段总数:', Object.keys(newEntry).length);
                console.log('[恢复缓存] 恢复条目所有字段:', Object.keys(newEntry).sort());
                
                return newEntry;
              });

              console.log('[恢复缓存] 准备恢复的条目:', entriesToRestore);

              // 使用createLorebookEntries API创建新条目
              const result = await TavernHelper.createLorebookEntries(bookName, entriesToRestore);
              console.log('[恢复缓存] 恢复结果:', result);

              if (result && result.new_uids && result.new_uids.length > 0) {
                // 从缓存中移除已恢复的条目
                const updatedCache = deleteCache.filter(entry => entry.id !== cacheId);
                localStorage.setItem('guixu_worldbook_delete_cache', JSON.stringify(updatedCache));
                
                this.showTemporaryMessage(`成功恢复 ${result.new_uids.length} 个条目`);
                
                // 刷新世界书列表
                this.loadWorldbookEntries();
                
                // 如果删除历史界面是打开的，也刷新它
                if (document.getElementById('worldbook-delete-history-modal')?.style.display !== 'none') {
                  this.renderDeleteHistory();
                }
                
                // 恢复原始的isFromSettingsModal状态
                this.isFromSettingsModal = originalFromSettings;
                
              } else {
                console.error('[恢复缓存] 恢复失败，API返回结果异常:', result);
                this.showTemporaryMessage('恢复失败：API调用异常');
              }
              
            } catch (error) {
              console.error('[恢复缓存] 恢复条目失败:', error);
              this.showTemporaryMessage(`恢复失败: ${error.message}`);
            }
          },

          // 显示通用确认模态框
          showConfirmModal(title, message, onConfirm, onCancel = null) {
            const modal = document.getElementById('worldbook-confirm-modal');
            const titleEl = document.getElementById('confirm-modal-title');
            const messageEl = document.getElementById('confirm-modal-message');
            const confirmBtn = document.getElementById('confirm-modal-confirm');
            const cancelBtn = document.getElementById('confirm-modal-cancel');

            if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
              console.error('确认模态框元素未找到');
              return;
            }

            titleEl.textContent = title;
            messageEl.innerHTML = message;

            // 清除之前的事件监听器
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // 添加新的事件监听器
            newConfirmBtn.addEventListener('click', () => {
              this.closeModal('worldbook-confirm-modal');
              if (onConfirm) onConfirm();
            });

            newCancelBtn.addEventListener('click', () => {
              this.closeModal('worldbook-confirm-modal');
              if (onCancel) onCancel();
            });

            this.openModal('worldbook-confirm-modal');
          },

          // 显示恢复确认模态框
          showRestoreConfirmModal(message, onConfirm, onCancel = null) {
            const modal = document.getElementById('worldbook-restore-confirm-modal');
            const messageEl = document.getElementById('restore-confirm-message');
            const confirmBtn = document.getElementById('restore-confirm-confirm');
            const cancelBtn = document.getElementById('restore-confirm-cancel');

            if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
              console.error('恢复确认模态框元素未找到');
              return;
            }

            messageEl.innerHTML = message;

            // 清除之前的事件监听器
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // 添加新的事件监听器
            newConfirmBtn.addEventListener('click', () => {
              this.closeModal('worldbook-restore-confirm-modal');
              if (onConfirm) onConfirm();
              // 返回到世界书管理界面
              this.showWorldbookManager();
            });

            newCancelBtn.addEventListener('click', () => {
              this.closeModal('worldbook-restore-confirm-modal');
              if (onCancel) onCancel();
              // 返回到世界书管理界面
              this.showWorldbookManager();
            });

            this.openModal('worldbook-restore-confirm-modal');
          },

          // 显示移除历史确认模态框
          showRemoveHistoryConfirmModal(message, onConfirm, onCancel = null) {
            const modal = document.getElementById('worldbook-remove-history-confirm-modal');
            const messageEl = document.getElementById('remove-history-confirm-message');
            const confirmBtn = document.getElementById('remove-history-confirm-confirm');
            const cancelBtn = document.getElementById('remove-history-confirm-cancel');

            if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
              console.error('移除历史确认模态框元素未找到');
              return;
            }

            messageEl.innerHTML = message;

            // 清除之前的事件监听器
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // 添加新的事件监听器
            newConfirmBtn.addEventListener('click', () => {
              this.closeModal('worldbook-remove-history-confirm-modal');
              if (onConfirm) onConfirm();
              // 返回到世界书管理界面
              this.showWorldbookManager();
            });

            newCancelBtn.addEventListener('click', () => {
              this.closeModal('worldbook-remove-history-confirm-modal');
              if (onCancel) onCancel();
              // 返回到世界书管理界面
              this.showWorldbookManager();
            });

            this.openModal('worldbook-remove-history-confirm-modal');
          },

          // 清空删除缓存
          clearDeleteCache() {
            try {
              localStorage.removeItem('guixu_worldbook_delete_cache');
              this.showTemporaryMessage('删除缓存已清空');
              
              // 如果删除历史界面是打开的，刷新它
              if (document.getElementById('worldbook-delete-history-modal')?.style.display !== 'none') {
                this.renderDeleteHistory();
              }
            } catch (error) {
              console.error('清空删除缓存失败:', error);
            }
          },

          // 从缓存中移除指定条目
          removeFromCache(cacheId) {
            try {
              const deleteCache = this.getDeleteCache();
              const updatedCache = deleteCache.filter(entry => entry.id !== cacheId);
              localStorage.setItem('guixu_worldbook_delete_cache', JSON.stringify(updatedCache));
              
              // 如果删除历史界面是打开的，刷新它
              if (document.getElementById('worldbook-delete-history-modal')?.style.display !== 'none') {
                this.renderDeleteHistory();
              }
            } catch (error) {
              console.error('移除缓存条目失败:', error);
            }
          },

          // --- 删除历史管理界面功能 ---
          
          // 显示删除历史管理界面
          showDeleteHistory() {
            this.openModal('worldbook-delete-history-modal');
            this.renderDeleteHistory();
            
            // 绑定事件监听器
            setTimeout(() => {
              this.bindDeleteHistoryEvents();
            }, 100);
          },

          // 渲染删除历史列表
          renderDeleteHistory() {
            const listContainer = document.getElementById('delete-history-list');
            const countElement = document.getElementById('delete-history-count');
            
            if (!listContainer || !countElement) return;

            const deleteCache = this.getDeleteCache();
            
            // 更新统计信息
            countElement.textContent = `共有 ${deleteCache.length} 条删除记录`;

            if (deleteCache.length === 0) {
              listContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #8b7355;">
                  <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                  <div style="font-size: 16px; margin-bottom: 8px;">暂无删除记录</div>
                  <div style="font-size: 12px;">删除的条目会自动保存在这里，方便您随时恢复</div>
                </div>
              `;
              return;
            }

            listContainer.innerHTML = '';

            deleteCache.forEach((cacheEntry, index) => {
              const entryDiv = document.createElement('div');
              entryDiv.className = 'delete-history-item';
              entryDiv.style.cssText = `
                background: rgba(26, 26, 46, 0.4);
                border: 1px solid #8b7355;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 12px;
                transition: all 0.3s ease;
              `;

              // 鼠标悬浮效果
              entryDiv.addEventListener('mouseenter', () => {
                entryDiv.style.background = 'rgba(26, 26, 46, 0.6)';
                entryDiv.style.borderColor = '#c9aa71';
              });
              entryDiv.addEventListener('mouseleave', () => {
                entryDiv.style.background = 'rgba(26, 26, 46, 0.4)';
                entryDiv.style.borderColor = '#8b7355';
              });

              const deleteTime = new Date(cacheEntry.timestamp);
              const timeStr = deleteTime.toLocaleString('zh-CN');
              
              entryDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                      <span style="background: ${cacheEntry.type === 'single' ? '#007bff' : '#9932cc'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-right: 10px;">
                        ${cacheEntry.type === 'single' ? '单个删除' : '批量删除'}
                      </span>
                      <span style="color: #c9aa71; font-size: 14px; font-weight: bold;">
                        ${cacheEntry.count} 个条目
                      </span>
                    </div>
                    <div style="color: #8b7355; font-size: 12px; margin-bottom: 8px;">
                      删除时间: ${timeStr}
                    </div>
                    <div style="color: #8b7355; font-size: 11px;">
                      ${cacheEntry.entries.map(entry => entry.comment || '未命名条目').slice(0, 3).join(', ')}
                      ${cacheEntry.entries.length > 3 ? ` 等${cacheEntry.entries.length}个条目` : ''}
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <button class="restore-cache-btn interaction-btn" data-cache-id="${cacheEntry.id}"
                            style="background: rgba(40, 167, 69, 0.2); border-color: #28a745; color: #28a745; font-size: 11px; padding: 6px 12px;">
                      🔄 恢复
                    </button>
                    <button class="remove-cache-btn interaction-btn" data-cache-id="${cacheEntry.id}"
                            style="background: rgba(255, 107, 107, 0.2); border-color: #ff6b6b; color: #ff6b6b; font-size: 11px; padding: 6px 12px;">
                      🗑️ 移除
                    </button>
                  </div>
                </div>
                <div class="delete-history-details" style="background: rgba(0, 0, 0, 0.2); border-radius: 4px; padding: 10px; font-size: 11px; color: #8b7355; max-height: 100px; overflow-y: auto;">
                  <strong>包含条目:</strong><br>
                  ${cacheEntry.entries.map((entry, i) => `${i + 1}. ${entry.comment || '未命名条目'}`).join('<br>')}
                </div>
              `;

              listContainer.appendChild(entryDiv);
            });
          },

          // 绑定删除历史界面事件监听器
          bindDeleteHistoryEvents() {
            // 清空历史按钮
            const clearBtn = document.getElementById('clear-delete-history-btn');
            if (clearBtn) {
              clearBtn.addEventListener('click', () => {
                this.showConfirmModal(
                  '清空删除历史',
                  '确定要清空所有删除历史吗？<br><br><span style="color: #ff6b6b; font-weight: bold;">⚠️ 清空后将无法恢复这些记录</span>',
                  () => {
                    this.clearDeleteCache();
                  }
                );
              });
            }

            // 关闭按钮
            const closeBtn = document.getElementById('close-delete-history');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                this.closeModal('worldbook-delete-history-modal');
              });
            }

            // 模态框背景点击关闭
            const modal = document.getElementById('worldbook-delete-history-modal');
            if (modal) {
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  this.closeModal('worldbook-delete-history-modal');
                }
              });
            }

            // 恢复和移除按钮事件委托
            const listContainer = document.getElementById('delete-history-list');
            if (listContainer) {
              listContainer.addEventListener('click', (e) => {
                const target = e.target;
                
                if (target.classList.contains('restore-cache-btn')) {
                  const cacheId = parseFloat(target.dataset.cacheId);
                  this.showRestoreConfirmModal(
                    '确定要恢复这些删除的条目吗？',
                    () => this.restoreFromCache(cacheId)
                  );
                } else if (target.classList.contains('remove-cache-btn')) {
                  const cacheId = parseFloat(target.dataset.cacheId);
                  this.showRemoveHistoryConfirmModal(
                    '确定要从历史记录中移除这条记录吗？<br><span style="color: #ff6b6b; font-weight: bold;">移除后将无法恢复。</span>',
                    () => this.removeFromCache(cacheId)
                  );
                }
              });
            }
          },

          // 批量删除筛选项（修改为使用新的确认流程）
          async deleteFilteredEntries() {
            if (!this.worldbookManagerState?.filteredEntries) return;
            
            const entries = this.worldbookManagerState.filteredEntries;
            if (entries.length === 0) {
              this.showTemporaryMessage('没有需要删除的条目');
              return;
            }

            // 使用新的删除确认模态框
            this.showDeleteConfirmModal('batch', entries);
          },

          async toggleWorldbookEntry(uid, enabled) {
            try {
              const bookName = '1归墟';
              await TavernHelper.setLorebookEntries(bookName, [{ uid, enabled }]);
              this.showTemporaryMessage(`世界书条目已${enabled ? '启用' : '禁用'}`);
              this.loadWorldbookEntries(); // 刷新列表
            } catch (error) {
              console.error('切换世界书条目状态失败:', error);
              this.showTemporaryMessage('操作失败，请重试');
            }
          },

          // 删除单个世界书条目（简化为一次确认）
          async deleteWorldbookEntry(uid, comment) {
            // 单个条目删除只需要简单确认，不需要二次确认和输入文本
            this.showConfirmModal(
              '删除条目确认',
              `确定要删除条目 <strong>"${comment}"</strong> 吗？<br><br><span style="color: #4a9eff;">💾 删除后可以在删除历史中恢复</span>`,
              async () => {
                try {
                  const bookName = '1归墟';
                  
                  // 在删除前获取完整的条目数据用于缓存
                  const fullEntry = this.worldbookManagerState?.allEntries?.find(entry => entry.uid === uid);
                  if (fullEntry) {
                    // 添加到删除缓存
                    this.addToDeleteCache([fullEntry]);
                  }
                  
                  // 执行删除
                  await TavernHelper.deleteLorebookEntries(bookName, [uid]);
                  this.showTemporaryMessage('世界书条目已删除');
                  
                  // 刷新列表
                  await this.loadWorldbookEntries();
                } catch (error) {
                  console.error('删除世界书条目失败:', error);
                  this.showTemporaryMessage('删除失败，请重试');
                }
              }
            );
          },

          // 绑定世界书管理界面事件监听器
          bindWorldbookManagerEvents() {
            // 筛选类型变化
            const filterTypeSelect = document.getElementById('worldbook-filter-type');
            if (filterTypeSelect) {
              filterTypeSelect.addEventListener('change', () => {
                this.applyWorldbookFilter();
              });
            }

            // 前缀筛选输入
            const prefixFilterInput = document.getElementById('worldbook-prefix-filter');
            if (prefixFilterInput) {
              prefixFilterInput.addEventListener('input', () => {
                this.applyWorldbookFilter();
              });
            }

            // 批量操作按钮
            const enableBtn = document.getElementById('enable-filtered-btn');
            if (enableBtn) {
              enableBtn.addEventListener('click', () => {
                this.enableFilteredEntries();
              });
            }

            const disableBtn = document.getElementById('disable-filtered-btn');
            if (disableBtn) {
              disableBtn.addEventListener('click', () => {
                this.disableFilteredEntries();
              });
            }

            // 右上角删除按钮
            const deleteHeaderBtn = document.getElementById('delete-filtered-btn-header');
            if (deleteHeaderBtn) {
              deleteHeaderBtn.addEventListener('click', () => {
                this.deleteFilteredEntries();
              });
            }

            // 删除历史按钮
            const deleteHistoryBtn = document.getElementById('show-delete-history-btn');
            if (deleteHistoryBtn) {
              deleteHistoryBtn.addEventListener('click', () => {
                this.showDeleteHistory();
              });
            }

            // 关闭按钮
            const closeBtn = document.getElementById('close-worldbook-manager');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                this.closeModal('worldbook-manager-modal');
              });
            }

            // 模态框背景点击关闭
            const modal = document.getElementById('worldbook-manager-modal');
            if (modal) {
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  this.closeModal('worldbook-manager-modal');
                }
              });
            }
          },

          // 绑定删除确认模态框事件监听器
          bindDeleteConfirmEvents() {
            // 第一步确认按钮
            const proceedBtn = document.getElementById('confirm-delete-step1-btn');
            if (proceedBtn) {
              proceedBtn.addEventListener('click', () => {
                this.proceedDeleteConfirm();
              });
            }

            // 第一步取消按钮
            const cancelStep1Btn = document.getElementById('cancel-delete-btn');
            if (cancelStep1Btn) {
              cancelStep1Btn.addEventListener('click', () => {
                this.cancelDelete();
              });
            }

            // 最终确认按钮
            const confirmBtn = document.getElementById('final-delete-btn');
            if (confirmBtn) {
              confirmBtn.addEventListener('click', () => {
                this.executeDelete();
              });
            }

            // 返回按钮
            const backBtn = document.getElementById('back-delete-step-btn');
            if (backBtn) {
              backBtn.addEventListener('click', () => {
                this.deleteConfirmState.step = 1;
                this.updateDeleteConfirmContent();
              });
            }

            // 输入框回车键确认
            const confirmInput = document.getElementById('delete-confirmation-input');
            if (confirmInput) {
              confirmInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                  this.executeDelete();
                }
              });
            }

            // 关闭按钮
            const closeBtn = document.getElementById('close-delete-confirm');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                this.cancelDelete();
              });
            }

            // 模态框背景点击关闭
            const modal = document.getElementById('worldbook-delete-confirm-modal');
            if (modal) {
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  this.cancelDelete();
                }
              });
            }
          },

          // --- 新增：世界书预设管理功能 ---
          // 显示预设管理界面
          showWorldbookPresets() {
            console.log('[预设管理] 开始显示预设管理界面');
            this.openModal('worldbook-presets-modal');
            
            // 延迟加载预设列表，确保模态框已显示
            setTimeout(() => {
              this.loadWorldbookPresets();
              this.bindPresetsManagerEvents();
            }, 100);
          },

          // 加载预设列表
          loadWorldbookPresets() {
            try {
              const saved = localStorage.getItem('guixu_worldbook_presets');
              if (saved) {
                this.worldbookPresets = JSON.parse(saved);
              }
              this.renderPresetsList();
            } catch (error) {
              console.error('[预设管理] 加载预设失败:', error);
              this.worldbookPresets = {};
            }
          },

          // 渲染预设列表
          renderPresetsList() {
            const listContainer = document.getElementById('presets-list');
            if (!listContainer) return;

            const presets = Object.values(this.worldbookPresets);
            if (presets.length === 0) {
              listContainer.innerHTML = `
                <div style="text-align: center; color: #8b7355; padding: 40px 20px;">
                  <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                  <div style="font-size: 16px; margin-bottom: 8px;">暂无预设</div>
                  <div style="font-size: 12px; opacity: 0.8;">点击右上角"新建预设"按钮创建第一个预设</div>
                </div>
              `;
              return;
            }

            const html = presets.map(preset => `
              <div class="preset-item" data-preset-id="${preset.id}" style="
                padding: 12px;
                margin-bottom: 8px;
                background: rgba(26, 26, 46, 0.6);
                border: 1px solid #8b7355;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                ${this.presetManagerState.selectedPresetId === preset.id ? 'border-color: #c9aa71; background: rgba(201, 170, 113, 0.1);' : ''}
              ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div style="color: #c9aa71; font-weight: bold; font-size: 14px;">${preset.name}</div>
                  <div style="display: flex; gap: 4px;">
                    <span style="
                      background: ${preset.enabled ? 'rgba(40, 167, 69, 0.2)' : 'rgba(108, 117, 125, 0.2)'};
                      color: ${preset.enabled ? '#28a745' : '#6c757d'};
                      padding: 2px 6px;
                      border-radius: 3px;
                      font-size: 10px;
                    ">${preset.enabled ? '启用' : '禁用'}</span>
                    <span style="color: #8b7355; font-size: 10px; padding: 2px 6px; background: rgba(139, 115, 85, 0.2); border-radius: 3px;">
                      ${preset.entries.length} 项
                    </span>
                  </div>
                </div>
                <div style="color: #8b7355; font-size: 12px; line-height: 1.4; margin-bottom: 8px;">
                  ${preset.description || '无描述'}
                </div>
                <div style="color: #666; font-size: 10px;">
                  创建时间: ${new Date(preset.createdAt).toLocaleString()}
                </div>
              </div>
            `).join('');

            listContainer.innerHTML = html;
          },

          // 显示预设详情
          showPresetDetails(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            this.presetManagerState.selectedPresetId = presetId;
            this.renderPresetsList(); // 重新渲染以更新选中状态

            const detailsContainer = document.getElementById('preset-details');
            if (!detailsContainer) return;

            const html = `
              <div style="height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                  <div>
                    <h3 style="color: #c9aa71; margin: 0 0 8px 0; font-size: 18px;">${preset.name}</h3>
                    <p style="color: #8b7355; margin: 0; font-size: 13px; line-height: 1.4;">
                      ${preset.description || '无描述'}
                    </p>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="interaction-btn" onclick="GuixuManager.editPreset('${preset.id}')" style="padding: 4px 8px; font-size: 11px;">编辑</button>
                    <button class="interaction-btn" onclick="GuixuManager.togglePresetStatus('${preset.id}')" style="
                      padding: 4px 8px;
                      font-size: 11px;
                      background: ${preset.enabled ? 'rgba(108, 117, 125, 0.2)' : 'rgba(40, 167, 69, 0.2)'};
                      border-color: ${preset.enabled ? '#6c757d' : '#28a745'};
                      color: ${preset.enabled ? '#6c757d' : '#28a745'};
                    ">${preset.enabled ? '禁用' : '启用'}</button>
                    <button class="interaction-btn" onclick="GuixuManager.deletePreset('${preset.id}')" style="
                      padding: 4px 8px;
                      font-size: 11px;
                      background: rgba(255, 107, 107, 0.2);
                      border-color: #ff6b6b;
                      color: #ff6b6b;
                    ">删除</button>
                  </div>
                </div>

                <div style="flex: 1; overflow-y: auto;">
                  <div style="margin-bottom: 15px;">
                    <div style="color: #c9aa71; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
                      📚 包含条目 (${preset.entries.length})
                    </div>
                    <div style="background: rgba(0, 0, 0, 0.3); border-radius: 4px; padding: 10px; max-height: 200px; overflow-y: auto;">
                      ${preset.entries.length > 0 ?
                        preset.entries.map(entryName => `
                          <div style="
                            padding: 6px 8px;
                            margin-bottom: 4px;
                            background: rgba(26, 26, 46, 0.6);
                            border-radius: 4px;
                            color: #e0dcd1;
                            font-size: 12px;
                            border-left: 3px solid #c9aa71;
                          ">${entryName}</div>
                        `).join('') :
                        '<div style="color: #8b7355; text-align: center; padding: 20px;">暂无条目</div>'
                      }
                    </div>
                  </div>

                  <div style="margin-bottom: 15px;">
                    <div style="color: #c9aa71; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
                      ⚙️ 预设信息
                    </div>
                    <div style="background: rgba(0, 0, 0, 0.3); border-radius: 4px; padding: 10px;">
                      <div style="display: grid; grid-template-columns: 80px 1fr; gap: 8px; font-size: 12px;">
                        <span style="color: #8b7355;">状态:</span>
                        <span style="color: ${preset.enabled ? '#28a745' : '#6c757d'};">
                          ${preset.enabled ? '✅ 启用中' : '❌ 已禁用'}
                        </span>
                        <span style="color: #8b7355;">条目数:</span>
                        <span style="color: #e0dcd1;">${preset.entries.length} 个</span>
                        <span style="color: #8b7355;">创建时间:</span>
                        <span style="color: #e0dcd1;">${new Date(preset.createdAt).toLocaleString()}</span>
                        <span style="color: #8b7355;">最后修改:</span>
                        <span style="color: #e0dcd1;">${preset.updatedAt ? new Date(preset.updatedAt).toLocaleString() : '未修改'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style="color: #c9aa71; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
                      🎯 快速操作
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                      <button class="interaction-btn" onclick="GuixuManager.exportPreset('${preset.id}')" style="padding: 8px 12px; font-size: 12px;">导出预设</button>
                      <button class="interaction-btn" onclick="GuixuManager.duplicatePreset('${preset.id}')" style="padding: 8px 12px; font-size: 12px;">复制预设</button>
                    </div>
                  </div>
                </div>
              </div>
            `;

            detailsContainer.innerHTML = html;
          },

          // 显示创建/编辑预设界面
          showCreatePresetModal(presetId = null) {
            this.currentEditingPreset = presetId;
            this.presetManagerState.isEditing = !!presetId;
            
            const modal = document.getElementById('preset-edit-modal');
            const title = document.getElementById('preset-edit-title');
            
            // 先打开模态框
            this.openModal('preset-edit-modal');
            
            // 延迟预填充内容，确保DOM已渲染
            setTimeout(() => {
              if (presetId) {
                title.textContent = '📝 编辑预设';
                const preset = this.worldbookPresets[presetId];
                if (preset) {
                  document.getElementById('preset-name-input').value = preset.name || '';
                  document.getElementById('preset-description-input').value = preset.description || '';
                }
              } else {
                title.textContent = '📝 新建预设';
                document.getElementById('preset-name-input').value = '';
                document.getElementById('preset-description-input').value = '';
              }
              
              // 加载条目选择列表
              this.loadEntriesForPresetEdit(presetId);
              this.bindPresetEditEvents();
            }, 150);
          },

          // 加载条目选择列表
          async loadEntriesForPresetEdit(presetId = null) {
            try {
              const bookName = '1归墟';
              const entries = await TavernHelper.getLorebookEntries(bookName);
              
              if (!entries || entries.length === 0) {
                document.getElementById('preset-entries-selection').innerHTML =
                  '<div style="text-align: center; color: #8b7355; padding: 20px;">暂无可选条目</div>';
                this.updatePresetFilterStats(0, 0);
                return;
              }

              // 获取已选条目列表
              let selectedEntries = [];
              if (presetId && this.worldbookPresets[presetId]) {
                selectedEntries = [...this.worldbookPresets[presetId].entries];
                console.log('[预设编辑] 加载已选条目:', selectedEntries);
              }

              // 存储所有条目用于筛选
              this.presetEditState = {
                allEntries: entries,
                filteredEntries: entries,
                selectedEntries: selectedEntries
              };
              
              // 应用当前筛选并渲染
              this.applyPresetFilter();
              
              // 确保复选框状态正确更新
              setTimeout(() => {
                this.updateCheckboxStates();
              }, 50);
              
            } catch (error) {
              console.error('[预设管理] 加载条目失败:', error);
              document.getElementById('preset-entries-selection').innerHTML =
                '<div style="text-align: center; color: #ff6b6b; padding: 20px;">加载条目失败</div>';
              this.updatePresetFilterStats(0, 0);
            }
          },

          // 更新复选框状态
          updateCheckboxStates() {
            if (!this.presetEditState?.selectedEntries) return;
            
            const checkboxes = document.querySelectorAll('#preset-entries-selection input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
              const entryName = checkbox.dataset.entryName;
              const isSelected = this.presetEditState.selectedEntries.includes(entryName);
              checkbox.checked = isSelected;
              
              // 更新边框颜色
              const parentDiv = checkbox.closest('div');
              if (parentDiv) {
                parentDiv.style.borderColor = isSelected ? '#c9aa71' : '#8b7355';
              }
            });
            
            console.log('[预设编辑] 复选框状态已更新，已选条目:', this.presetEditState.selectedEntries.length);
          },

          // 应用预设条目筛选
          applyPresetFilter() {
            if (!this.presetEditState) return;

            const filterType = document.getElementById('preset-filter-type')?.value || 'all';
            const prefixFilter = document.getElementById('preset-prefix-filter')?.value.trim() || '';
            
            let filtered = [...this.presetEditState.allEntries];
            
            // 按类型筛选
            switch (filterType) {
              case 'journey':
                filtered = filtered.filter(entry =>
                  entry.comment && (entry.comment.includes('本世历程') || entry.comment.includes('历程'))
                );
                break;
              case 'pastlife':
                filtered = filtered.filter(entry =>
                  entry.comment && (entry.comment.includes('往世涟漪') || entry.comment.includes('涟漪'))
                );
                break;
              case 'bracket':
                filtered = filtered.filter(entry =>
                  entry.comment && entry.comment.includes('【') && entry.comment.includes('】')
                );
                break;
              case 'enabled':
                filtered = filtered.filter(entry => entry.enabled);
                break;
              case 'disabled':
                filtered = filtered.filter(entry => !entry.enabled);
                break;
              case 'all':
              default:
                // 不筛选
                break;
            }
            
            // 按关键词筛选
            if (prefixFilter) {
              filtered = filtered.filter(entry =>
                entry.comment && entry.comment.includes(prefixFilter)
              );
            }
            
            this.presetEditState.filteredEntries = filtered;
            this.renderPresetEntries(filtered);
            this.updatePresetFilterStats(filtered.length, this.presetEditState.allEntries.length);
          },

          // 渲染预设条目列表
          renderPresetEntries(entries) {
            const selectedEntries = this.presetEditState.selectedEntries;
            
            const html = entries.map(entry => {
              const isSelected = selectedEntries.includes(entry.comment || entry.uid);
              return `
                <div style="
                  display: flex;
                  align-items: center;
                  padding: 8px;
                  margin-bottom: 4px;
                  background: rgba(26, 26, 46, 0.4);
                  border-radius: 4px;
                  border: 1px solid ${isSelected ? '#c9aa71' : '#8b7355'};
                ">
                  <input type="checkbox"
                         id="entry-${entry.uid}"
                         data-entry-name="${entry.comment || entry.uid}"
                         ${isSelected ? 'checked' : ''}
                         style="margin-right: 10px; cursor: pointer;">
                  <label for="entry-${entry.uid}" style="
                    flex: 1;
                    cursor: pointer;
                    color: #e0dcd1;
                    font-size: 13px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  ">
                    <span>${entry.comment || entry.uid}</span>
                    <span style="
                      color: ${entry.enabled ? '#28a745' : '#6c757d'};
                      font-size: 10px;
                      padding: 2px 6px;
                      background: ${entry.enabled ? 'rgba(40, 167, 69, 0.2)' : 'rgba(108, 117, 125, 0.2)'};
                      border-radius: 3px;
                    ">${entry.enabled ? '启用' : '禁用'}</span>
                  </label>
                </div>
              `;
            }).join('');

            document.getElementById('preset-entries-selection').innerHTML = html ||
              '<div style="text-align: center; color: #8b7355; padding: 20px;">没有符合条件的条目</div>';
          },

          // 更新预设筛选统计信息
          updatePresetFilterStats(filtered, total) {
            const statsElement = document.getElementById('preset-filter-stats');
            if (statsElement) {
              statsElement.textContent = `显示: ${filtered}/${total}`;
            }
          },

          // 保存预设
          savePreset() {
            const name = document.getElementById('preset-name-input').value.trim();
            const description = document.getElementById('preset-description-input').value.trim();
            
            if (!name) {
              this.showTemporaryMessage('请输入预设名称', 'error', 3000);
              return;
            }

            // 获取选中的条目
            const selectedEntries = [];
            const checkboxes = document.querySelectorAll('#preset-entries-selection input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
              selectedEntries.push(checkbox.dataset.entryName);
            });

            if (selectedEntries.length === 0) {
              this.showTemporaryMessage('请至少选择一个条目', 'error', 3000);
              return;
            }

            const presetId = this.currentEditingPreset || this.generatePresetId();
            const now = new Date().toISOString();
            
            const preset = {
              id: presetId,
              name: name,
              description: description,
              entries: selectedEntries,
              enabled: this.currentEditingPreset ? this.worldbookPresets[this.currentEditingPreset].enabled : true,
              createdAt: this.currentEditingPreset ? this.worldbookPresets[this.currentEditingPreset].createdAt : now,
              updatedAt: now
            };

            this.worldbookPresets[presetId] = preset;
            this.saveWorldbookPresets();
            
            this.closeModal('preset-edit-modal');
            this.showWorldbookPresets(); // 返回预设管理界面
            this.updatePresetsInSettings();
            
            this.showTemporaryMessage(
              this.currentEditingPreset ? '预设已更新' : '预设已创建',
              'success',
              3000
            );
          },

          // 生成预设ID
          generatePresetId() {
            return 'preset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          },

          // 保存预设到本地存储
          saveWorldbookPresets() {
            try {
              localStorage.setItem('guixu_worldbook_presets', JSON.stringify(this.worldbookPresets));
            } catch (error) {
              console.error('[预设管理] 保存预设失败:', error);
            }
          },

          // 切换预设状态
          togglePresetStatus(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            preset.enabled = !preset.enabled;
            preset.updatedAt = new Date().toISOString();
            
            this.saveWorldbookPresets();
            this.renderPresetsList();
            this.showPresetDetails(presetId);
            this.updatePresetsInSettings();
            
            this.showTemporaryMessage(
              `预设已${preset.enabled ? '启用' : '禁用'}`,
              'success'
            );
          },

          // 删除预设
          deletePreset(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            // showCustomConfirm的第一个参数是消息，第二个是确认回调，第三个是取消回调，第四个是保持当前模态框
            this.showCustomConfirm(
              `确定要删除预设"${preset.name}"吗？此操作不可撤销。`,
              () => {
                // 删除预设数据
                delete this.worldbookPresets[presetId];
                this.saveWorldbookPresets();
                
                // 更新界面
                this.renderPresetsList();
                this.updatePresetsInSettings();
                
                // 清空详情面板
                const detailsPanel = document.getElementById('preset-details');
                if (detailsPanel) {
                  detailsPanel.innerHTML = `
                    <div style="text-align: center; color: #8b7355; padding: 40px 20px;">
                      <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                      <div style="font-size: 16px; margin-bottom: 8px;">选择预设查看详情</div>
                      <div style="font-size: 12px; opacity: 0.8;">点击左侧预设项目查看和编辑详细信息</div>
                    </div>
                  `;
                }
                
                // 重置选中状态
                if (this.presetManagerState) {
                  this.presetManagerState.selectedPresetId = null;
                }
                
                this.showTemporaryMessage('预设已删除', 'success', 3000);
              },
              null, // 取消回调
              true  // keepCurrentModal - 保持预设管理模态框打开
            );
          },

          // 应用预设（批量开启/关闭条目）
          async applyPreset(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            try {
              const bookName = '1归墟';
              
              // 获取所有世界书条目
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              if (!allEntries || allEntries.length === 0) {
                this.showTemporaryMessage('未找到世界书条目', 'error');
                return;
              }

              // 找到需要更新的条目
              const entriesToUpdate = [];
              let successCount = 0;
              let failCount = 0;

              for (const entryName of preset.entries) {
                const entry = allEntries.find(e => (e.comment || e.uid.toString()) === entryName);
                if (entry) {
                  entriesToUpdate.push({
                    uid: entry.uid,
                    enabled: preset.enabled
                  });
                  successCount++;
                } else {
                  console.warn(`[预设应用] 未找到条目: ${entryName}`);
                  failCount++;
                }
              }

              // 批量更新条目
              if (entriesToUpdate.length > 0) {
                await TavernHelper.setLorebookEntries(bookName, entriesToUpdate);
              }

              const message = failCount > 0 ?
                `预设应用完成：成功 ${successCount} 个，失败 ${failCount} 个` :
                `预设应用成功：已${preset.enabled ? '启用' : '禁用'} ${successCount} 个条目`;
              
              this.showTemporaryMessage(message, failCount > 0 ? 'warning' : 'success', 3000);
            } catch (error) {
              console.error('[预设应用] 应用预设失败:', error);
              this.showTemporaryMessage('应用预设失败', 'error', 3000);
            }
          },

          // 编辑预设
          editPreset(presetId) {
            this.showCreatePresetModal(presetId);
          },

          // 复制预设
          duplicatePreset(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            const newPresetId = this.generatePresetId();
            const now = new Date().toISOString();
            
            const newPreset = {
              ...preset,
              id: newPresetId,
              name: preset.name + ' (副本)',
              createdAt: now,
              updatedAt: now
            };

            this.worldbookPresets[newPresetId] = newPreset;
            this.saveWorldbookPresets();
            this.renderPresetsList();
            this.updatePresetsInSettings();
            
            this.showTemporaryMessage('预设已复制', 'success', 3000);
          },

          // 导出预设
          exportPreset(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            const exportData = {
              version: '1.0',
              preset: preset,
              exportTime: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `归墟预设_${preset.name}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showTemporaryMessage('预设已导出', 'success', 3000);
          },

          // 更新设置界面中的预设列表
          updatePresetsInSettings() {
            const container = document.getElementById('worldbook-presets-container');
            if (!container) return;

            const presets = Object.values(this.worldbookPresets);
            if (presets.length === 0) {
              container.innerHTML = `
                <div style="color: #8b7355; font-size: 12px; text-align: center; padding: 10px;">
                  暂无预设，点击上方按钮创建预设
                </div>
              `;
              return;
            }

            // 初始化折叠状态（如果不存在）
            if (!this.presetCollapseState) {
              this.presetCollapseState = {
                mainCollapsed: true, // 主面板默认折叠
                presetDetails: {} // 各个预设的详情折叠状态
              };
            }

            const mainCollapsed = this.presetCollapseState.mainCollapsed;
            const html = `
              <!-- 主标题栏 -->
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 10px;
                background: rgba(0, 0, 0, 0.4);
                border-radius: 4px;
                cursor: pointer;
                border: 1px solid #8b7355;
              " onclick="GuixuManager.toggleMainPresetCollapse()">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="
                    color: #c9aa71;
                    font-size: 12px;
                    font-weight: bold;
                    transform: rotate(${mainCollapsed ? '0deg' : '90deg'});
                    transition: transform 0.2s ease;
                  ">▶</span>
                  <span style="color: #c9aa71; font-size: 13px; font-weight: bold;">世界书预设</span>
                </div>
                <span style="
                  color: #8b7355;
                  font-size: 10px;
                  padding: 2px 6px;
                  background: rgba(139, 115, 85, 0.2);
                  border-radius: 2px;
                ">${presets.length} 个</span>
              </div>

              <!-- 预设列表 -->
              <div id="preset-list-content" style="
                display: ${mainCollapsed ? 'none' : 'block'};
                margin-top: 6px;
                padding-left: 8px;
              ">
                ${presets.map(preset => this.renderPresetItem(preset)).join('')}
              </div>
            `;

            container.innerHTML = html;
          },

          // 渲染单个预设项
          renderPresetItem(preset) {
            const isExpanded = this.presetCollapseState.presetDetails[preset.id] || false;
            
            return `
              <div style="margin-bottom: 8px;">
                <!-- 预设标题栏 -->
                <div style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 6px 8px;
                  background: rgba(26, 26, 46, 0.4);
                  border-radius: 4px;
                  border: 1px solid ${preset.enabled ? '#c9aa71' : '#8b7355'};
                ">
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <input type="checkbox"
                           id="preset-toggle-${preset.id}"
                           ${preset.enabled ? 'checked' : ''}
                           onchange="GuixuManager.togglePresetFromSettings('${preset.id}')"
                           style="cursor: pointer;">
                    <span style="
                      color: #e0dcd1;
                      font-size: 11px;
                      cursor: pointer;
                      transform: rotate(${isExpanded ? '90deg' : '0deg'});
                      transition: transform 0.2s ease;
                    " onclick="GuixuManager.togglePresetDetails('${preset.id}')">▶</span>
                    <label for="preset-toggle-${preset.id}" style="
                      color: #e0dcd1;
                      font-size: 12px;
                      cursor: pointer;
                      flex: 1;
                    " onclick="GuixuManager.togglePresetDetails('${preset.id}')">${preset.name}</label>
                  </div>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="
                      color: ${preset.enabled ? '#28a745' : '#8b7355'};
                      font-size: 9px;
                      padding: 1px 4px;
                      background: ${preset.enabled ? 'rgba(40, 167, 69, 0.2)' : 'rgba(139, 115, 85, 0.2)'};
                      border-radius: 2px;
                    ">${preset.enabled ? '启用' : '禁用'}</span>
                    <span style="
                      color: #8b7355;
                      font-size: 10px;
                      padding: 2px 4px;
                      background: rgba(139, 115, 85, 0.2);
                      border-radius: 2px;
                    ">${preset.entries.length}</span>
                  </div>
                </div>

                <!-- 预设详情 -->
                <div id="preset-details-${preset.id}" style="
                  display: ${isExpanded ? 'block' : 'none'};
                  margin-top: 4px;
                  margin-left: 16px;
                  padding: 8px;
                  background: rgba(0, 0, 0, 0.2);
                  border-radius: 4px;
                  border-left: 2px solid #c9aa71;
                ">
                  ${preset.description ? `
                    <div style="
                      color: #8b7355;
                      font-size: 11px;
                      margin-bottom: 6px;
                      line-height: 1.3;
                    ">${preset.description}</div>
                  ` : ''}
                  
                  <div style="
                    color: #8b7355;
                    font-size: 10px;
                    font-weight: bold;
                    margin-bottom: 4px;
                  ">包含条目 (${preset.entries.length}):</div>
                  
                  <div style="
                    max-height: 120px;
                    overflow-y: auto;
                    font-size: 10px;
                  ">
                    ${preset.entries.length > 0 ?
                      preset.entries.map(entryName => `
                        <div style="
                          color: #e0dcd1;
                          padding: 2px 4px;
                          margin-bottom: 2px;
                          background: rgba(26, 26, 46, 0.3);
                          border-radius: 2px;
                          border-left: 2px solid #8b7355;
                        ">• ${entryName}</div>
                      `).join('') :
                      '<div style="color: #8b7355; text-align: center; padding: 8px;">暂无条目</div>'
                    }
                  </div>
                  
                  <div style="
                    margin-top: 6px;
                    padding-top: 6px;
                    border-top: 1px solid rgba(139, 115, 85, 0.3);
                    font-size: 9px;
                    color: #666;
                  ">
                    创建: ${new Date(preset.createdAt).toLocaleString('zh-CN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                    ${preset.updatedAt ? ` | 更新: ${new Date(preset.updatedAt).toLocaleString('zh-CN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}` : ''}
                  </div>
                </div>
              </div>
            `;
          },

          // 切换主预设面板折叠状态
          toggleMainPresetCollapse() {
            if (!this.presetCollapseState) {
              this.presetCollapseState = { mainCollapsed: true, presetDetails: {} };
            }
            
            this.presetCollapseState.mainCollapsed = !this.presetCollapseState.mainCollapsed;
            this.updatePresetsInSettings();
          },

          // 切换预设详情折叠状态
          togglePresetDetails(presetId) {
            if (!this.presetCollapseState) {
              this.presetCollapseState = { mainCollapsed: false, presetDetails: {} };
            }
            
            this.presetCollapseState.presetDetails[presetId] = !this.presetCollapseState.presetDetails[presetId];
            this.updatePresetsInSettings();
          },

          // 从设置界面切换预设状态
          async togglePresetFromSettings(presetId) {
            const preset = this.worldbookPresets[presetId];
            if (!preset) return;

            // 切换预设状态
            preset.enabled = !preset.enabled;
            preset.updatedAt = new Date().toISOString();
            
            this.saveWorldbookPresets();
            this.renderPresetsList();
            this.updatePresetsInSettings();
            
            // 自动应用预设（批量开启/关闭相关世界书条目）
            try {
              const bookName = '1归墟';
              
              // 获取所有世界书条目
              const allEntries = await TavernHelper.getLorebookEntries(bookName);
              if (!allEntries || allEntries.length === 0) {
                this.showTemporaryMessage('未找到世界书条目', 'error', 3000);
                return;
              }

              // 找到需要更新的条目
              const entriesToUpdate = [];
              let successCount = 0;
              let failCount = 0;

              for (const entryName of preset.entries) {
                const entry = allEntries.find(e => (e.comment || e.uid.toString()) === entryName);
                if (entry) {
                  entriesToUpdate.push({
                    uid: entry.uid,
                    enabled: preset.enabled
                  });
                  successCount++;
                } else {
                  console.warn(`[预设应用] 未找到条目: ${entryName}`);
                  failCount++;
                }
              }

              // 批量更新条目
              if (entriesToUpdate.length > 0) {
                await TavernHelper.setLorebookEntries(bookName, entriesToUpdate);
              }

              const message = failCount > 0 ?
                `预设"${preset.name}"已${preset.enabled ? '启用' : '禁用'}：成功 ${successCount} 个，失败 ${failCount} 个` :
                `预设"${preset.name}"已${preset.enabled ? '启用' : '禁用'}：${preset.enabled ? '启用' : '禁用'}了 ${successCount} 个条目`;
              
              this.showTemporaryMessage(message, failCount > 0 ? 'warning' : 'success', 3000);
            } catch (error) {
              console.error('[预设应用] 应用预设失败:', error);
              this.showTemporaryMessage('应用预设失败', 'error', 3000);
            }
          },

          // 绑定预设管理事件
          bindPresetsManagerEvents() {
            // 预设列表点击事件
            const listContainer = document.getElementById('presets-list');
            if (listContainer) {
              listContainer.addEventListener('click', (e) => {
                const presetItem = e.target.closest('.preset-item');
                if (presetItem) {
                  const presetId = presetItem.dataset.presetId;
                  this.showPresetDetails(presetId);
                }
              });
            }

            // 新建预设按钮
            const createBtn = document.getElementById('create-preset-btn');
            if (createBtn) {
              createBtn.addEventListener('click', () => {
                this.showCreatePresetModal();
              });
            }

            // 关闭按钮 - 优化：返回到世界书管理界面
            const closeBtn = document.getElementById('close-presets-modal');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                this.closeModal('worldbook-presets-modal');
                // 如果是从世界书管理界面进入的，返回到世界书管理界面
                if (this.isFromWorldbookManager) {
                  this.showWorldbookManager();
                  this.isFromWorldbookManager = false; // 重置标志位
                }
              });
            }

            // 模态框背景点击关闭 - 优化：返回到世界书管理界面
            const modal = document.getElementById('worldbook-presets-modal');
            if (modal) {
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  this.closeModal('worldbook-presets-modal');
                  // 如果是从世界书管理界面进入的，返回到世界书管理界面
                  if (this.isFromWorldbookManager) {
                    this.showWorldbookManager();
                    this.isFromWorldbookManager = false; // 重置标志位
                  }
                }
              });
            }
          },

          // 绑定预设编辑事件
          bindPresetEditEvents() {
            // 先清理旧的事件监听器，避免重复绑定
            this.cleanupPresetEditEvents();

            // 筛选类型变化
            const filterTypeSelect = document.getElementById('preset-filter-type');
            if (filterTypeSelect) {
              filterTypeSelect.addEventListener('change', () => {
                this.applyPresetFilter();
              });
            }

            // 关键词筛选输入
            const prefixFilterInput = document.getElementById('preset-prefix-filter');
            if (prefixFilterInput) {
              prefixFilterInput.addEventListener('input', () => {
                this.applyPresetFilter();
              });
            }

            // 条目复选框变化监听（使用事件委托）
            const entriesContainer = document.getElementById('preset-entries-selection');
            if (entriesContainer) {
              entriesContainer.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                  const entryName = e.target.dataset.entryName;
                  if (!this.presetEditState) this.presetEditState = { selectedEntries: [] };
                  
                  if (e.target.checked) {
                    // 添加到已选列表
                    if (!this.presetEditState.selectedEntries.includes(entryName)) {
                      this.presetEditState.selectedEntries.push(entryName);
                    }
                  } else {
                    // 从已选列表移除
                    const index = this.presetEditState.selectedEntries.indexOf(entryName);
                    if (index > -1) {
                      this.presetEditState.selectedEntries.splice(index, 1);
                    }
                  }
                  
                  // 更新边框颜色
                  const parentDiv = e.target.closest('div');
                  if (parentDiv) {
                    parentDiv.style.borderColor = e.target.checked ? '#c9aa71' : '#8b7355';
                  }
                  
                  console.log('[预设编辑] 条目选择变化:', entryName, e.target.checked);
                }
              });
            }

            // 全选按钮
            const selectAllBtn = document.getElementById('select-all-entries');
            if (selectAllBtn) {
              selectAllBtn.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('#preset-entries-selection input[type="checkbox"]');
                checkboxes.forEach(cb => {
                  cb.checked = true;
                  // 触发change事件以更新selectedEntries
                  cb.dispatchEvent(new Event('change', { bubbles: true }));
                });
              });
            }

            // 全不选按钮
            const deselectAllBtn = document.getElementById('deselect-all-entries');
            if (deselectAllBtn) {
              deselectAllBtn.addEventListener('click', () => {
                const checkboxes = document.querySelectorAll('#preset-entries-selection input[type="checkbox"]');
                checkboxes.forEach(cb => {
                  cb.checked = false;
                  // 触发change事件以更新selectedEntries
                  cb.dispatchEvent(new Event('change', { bubbles: true }));
                });
              });
            }

            // 选择已启用按钮
            const selectEnabledBtn = document.getElementById('select-enabled-entries');
            if (selectEnabledBtn) {
              selectEnabledBtn.addEventListener('click', () => {
                if (!this.presetEditState?.filteredEntries) return;
                
                const checkboxes = document.querySelectorAll('#preset-entries-selection input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                  const entryName = checkbox.dataset.entryName;
                  const entry = this.presetEditState.filteredEntries.find(e => (e.comment || e.uid) === entryName);
                  const shouldCheck = entry && entry.enabled;
                  
                  if (checkbox.checked !== shouldCheck) {
                    checkbox.checked = shouldCheck;
                    // 触发change事件以更新selectedEntries
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                });
              });
            }

            // 保存按钮 - 优化：保存后返回预设管理界面
            const saveBtn = document.getElementById('save-preset');
            if (saveBtn) {
              saveBtn.addEventListener('click', () => {
                this.savePreset();
              });
            }

            // 取消按钮 - 优化：返回预设管理界面
            const cancelBtn = document.getElementById('cancel-preset-edit');
            if (cancelBtn) {
              cancelBtn.addEventListener('click', () => {
                this.closeModal('preset-edit-modal');
                this.showWorldbookPresets(); // 返回预设管理界面
              });
            }

            // 关闭按钮 - 优化：返回预设管理界面
            const closeBtn = document.getElementById('close-preset-edit');
            if (closeBtn) {
              closeBtn.addEventListener('click', () => {
                this.closeModal('preset-edit-modal');
                this.showWorldbookPresets(); // 返回预设管理界面
              });
            }

            // 模态框背景点击关闭 - 优化：返回预设管理界面
            const modal = document.getElementById('preset-edit-modal');
            if (modal) {
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  this.closeModal('preset-edit-modal');
                  this.showWorldbookPresets(); // 返回预设管理界面
                }
              });
            }
          },

          // 清理预设编辑事件监听器
          cleanupPresetEditEvents() {
            const elements = [
              'preset-filter-type',
              'preset-prefix-filter',
              'select-all-entries',
              'deselect-all-entries',
              'select-enabled-entries',
              'save-preset',
              'cancel-preset-edit',
              'close-preset-edit',
              'preset-edit-modal'
            ];

            elements.forEach(id => {
              const element = document.getElementById(id);
              if (element) {
                // 通过克隆节点来移除所有事件监听器
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
              }
            });
          },


          // --- 新增：背景图设置功能 ---
          showBackgroundSettings() {
            this.openModal('background-settings-modal');
            this.renderBackgroundList();
            this.updateBackgroundModeUI();
            
            // 确保在模态框打开后绑定事件
            setTimeout(() => {
              this.bindBackgroundListEvents();
            }, 100);
          },

          updateBackgroundModeUI() {
            const randomRadio = document.getElementById('bg-mode-random');
            const fixedRadio = document.getElementById('bg-mode-fixed');
            if (randomRadio && fixedRadio) {
              randomRadio.checked = this.backgroundMode === 'random';
              fixedRadio.checked = this.backgroundMode === 'fixed';
            }
          },

          renderBackgroundList() {
            const listContainer = document.getElementById('background-list');
            const countSpan = document.getElementById('background-count');
            if (!listContainer || !countSpan) return;

            countSpan.textContent = `(${this.backgroundImages.length}张)`;
            listContainer.innerHTML = '';

            if (this.backgroundImages.length === 0) {
              listContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #8b7355; padding: 20px;">暂无背景图</div>';
              return;
            }

            this.backgroundImages.forEach(bg => {
              const item = document.createElement('div');
              item.className = 'background-item';
              item.dataset.bgId = bg.id;
              
              // 如果是固定模式下的选中背景，添加选中样式
              if (this.backgroundMode === 'fixed' && this.selectedBackgroundId === bg.id) {
                item.classList.add('selected');
              }

              // 为外链图片添加特殊标识
              const linkIcon = bg.isUrlImage ? '<div style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.7); color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 10px;">🔗</div>' : '';
              
              item.innerHTML = `
                <img src="${bg.dataUrl}" alt="${bg.name}" style="width: 100%; height: 100%; object-fit: cover;">
                ${linkIcon}
                <div class="background-item-overlay">
                  <div class="background-item-actions">
                    <button class="background-item-btn preview-btn" data-bg-id="${bg.id}">预览</button>
                    <button class="background-item-btn select-btn" data-bg-id="${bg.id}">选择</button>
                    <button class="background-item-btn delete" data-bg-id="${bg.id}">删除</button>
                  </div>
                </div>
              `;

              // 如果是当前预览的背景，显示指示器
              if (this.backgroundMode === 'fixed' && this.selectedBackgroundId === bg.id) {
                const indicator = document.createElement('div');
                indicator.className = 'background-preview-indicator';
                indicator.textContent = '当前';
                item.appendChild(indicator);
              }

              listContainer.appendChild(item);
            });

            // 绑定事件
            this.bindBackgroundListEvents();
          },

          bindBackgroundListEvents() {
            const listContainer = document.getElementById('background-list');
            if (!listContainer) return;

            // 移除旧的事件监听器（如果存在）
            if (this.backgroundListClickHandler) {
              listContainer.removeEventListener('click', this.backgroundListClickHandler);
            }

            // 创建新的事件处理器并保存引用
            this.backgroundListClickHandler = (e) => {
              const bgId = e.target.dataset.bgId;
              if (!bgId) return;

              if (e.target.classList.contains('preview-btn')) {
                this.previewBackground(bgId);
              } else if (e.target.classList.contains('select-btn')) {
                this.selectBackground(bgId);
              } else if (e.target.classList.contains('delete')) {
                this.deleteBackground(bgId);
              }
            };

            // 绑定新的事件监听器
            listContainer.addEventListener('click', this.backgroundListClickHandler);
          },

          // 新增：将背景设置模态框内的静态事件绑定分离出来
          bindBackgroundSettingsListeners() {
              if (this.backgroundEventsInitialized) return; // 确保只绑定一次

              // 绑定上传区域事件
              const uploadArea = document.getElementById('background-upload-area');
              const fileInput = document.getElementById('background-file-input');
              if (uploadArea && fileInput) {
                  uploadArea.addEventListener('click', () => fileInput.click());
                  fileInput.addEventListener('change', (e) => this.handleBackgroundUpload(e));
              }

              // 绑定模式切换事件
              const randomRadio = document.getElementById('bg-mode-random');
              const fixedRadio = document.getElementById('bg-mode-fixed');
              if (randomRadio && fixedRadio) {
                  randomRadio.addEventListener('change', () => {
                      if (randomRadio.checked) {
                          this.backgroundMode = 'random';
                          this.saveBackgroundSettings();
                          this.renderBackgroundList();
                      }
                  });
                  fixedRadio.addEventListener('change', () => {
                      if (fixedRadio.checked) {
                          this.backgroundMode = 'fixed';
                          this.saveBackgroundSettings();
                          this.renderBackgroundList();
                      }
                  });
              }

              // 绑定外链图床按钮事件
              const addUrlBtn = document.getElementById('add-url-image-btn');
              if (addUrlBtn) {
                  addUrlBtn.addEventListener('click', () => this.handleUrlImageAdd());
              }

              // 绑定管理外链按钮事件
              const manageUrlBtn = document.getElementById('manage-url-images-btn');
              if (manageUrlBtn) {
                  manageUrlBtn.addEventListener('click', () => this.showUrlImagesManageModal());
              }

              // 标记为已初始化
              this.backgroundEventsInitialized = true;
          },

          async handleBackgroundUpload(event) {
            const files = event.target.files;
            if (!files || files.length === 0) {
              console.warn('[归墟背景] 没有选择文件');
              return;
            }

            console.log(`[归墟背景] 开始处理 ${files.length} 个文件`);
            this.showTemporaryMessage('正在处理图片...', 3000);

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              console.log(`[归墟背景] 处理文件: ${file.name}, 大小: ${file.size} bytes, 类型: ${file.type}`);
              
              // 检查文件类型
              if (!file.type.startsWith('image/')) {
                console.error(`[归墟背景] 文件类型无效: ${file.type}`);
                this.showTemporaryMessage(`文件 ${file.name} 不是有效的图片格式`);
                continue;
              }

              try {
                let processedDataUrl;
                let compressionApplied = false;

                // 检查文件大小，如果超过2MB则尝试压缩
                if (file.size > 2 * 1024 * 1024) {
                  console.log(`[归墟背景] 文件过大 (${file.size} bytes)，尝试压缩...`);
                  try {
                    processedDataUrl = await this.compressImage(file, 0.8, 1920, 1080);
                    compressionApplied = true;
                    console.log(`[归墟背景] 图片压缩成功`);
                  } catch (compressionError) {
                    console.error(`[归墟背景] 图片压缩失败:`, compressionError);
                    // 如果压缩失败，尝试使用Object URL方式
                    try {
                      processedDataUrl = await this.createObjectUrlForLargeImage(file);
                      console.log(`[归墟背景] 使用Object URL处理大图片`);
                    } catch (objectUrlError) {
                      console.error(`[归墟背景] Object URL创建失败:`, objectUrlError);
                      this.showTemporaryMessage(`文件 ${file.name} 过大且处理失败，请选择小于2MB的图片`);
                      continue;
                    }
                  }
                } else {
                  // 文件大小合适，直接转换
                  processedDataUrl = await this.fileToDataUrl(file);
                  console.log(`[归墟背景] 直接转换为DataURL成功`);
                }

                const bgId = 'bg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                const newBackground = {
                  id: bgId,
                  name: file.name.replace(/\.[^/.]+$/, ""), // 移除文件扩展名
                  dataUrl: processedDataUrl,
                  uploadTime: new Date().toISOString(),
                  isPreset: false,
                  compressed: compressionApplied,
                  originalSize: file.size
                };

                // 临时添加到数组中测试存储
                const tempImages = [...this.backgroundImages, newBackground];
                const testSettings = {
                  images: tempImages,
                  mode: this.backgroundMode,
                  selectedId: this.selectedBackgroundId
                };

                // 测试是否能够成功保存到localStorage
                try {
                  const testData = JSON.stringify(testSettings);
                  console.log(`[归墟背景] 测试数据大小: ${testData.length} 字符`);
                  
                  // 检查数据大小（localStorage通常限制为5-10MB）
                  if (testData.length > 4 * 1024 * 1024) { // 4MB限制
                    throw new Error('存储空间不足');
                  }
                  
                  // 尝试保存测试数据
                  localStorage.setItem('guixu_background_test', testData);
                  localStorage.removeItem('guixu_background_test');
                  
                  // 如果测试成功，正式添加图片
                  this.backgroundImages.push(newBackground);
                  this.saveBackgroundSettings();
                  
                  console.log(`[归墟背景] 成功保存图片: ${file.name}, 当前图片数量: ${this.backgroundImages.length}`);
                  
                  // 显示成功消息，包含压缩信息
                  if (compressionApplied) {
                    this.showTemporaryMessage(`图片 ${file.name} 已压缩并保存成功`);
                  } else {
                    this.showTemporaryMessage(`图片 ${file.name} 保存成功`);
                  }
                  
                } catch (storageError) {
                  console.error('[归墟背景] localStorage存储失败:', storageError);
                  this.showTemporaryMessage(`图片 ${file.name} 保存失败：存储空间不足或图片过大`);
                  continue;
                }
                
                // 如果背景设置模态框是打开的，刷新列表
                if (document.getElementById('background-settings-modal').style.display === 'flex') {
                  this.renderBackgroundList();
                }
                
              } catch (error) {
                console.error('[归墟背景] 处理图片失败:', error);
                this.showTemporaryMessage(`处理图片 ${file.name} 失败: ${error.message}`);
              }
            }

            // 清空文件输入
            event.target.value = '';
            this.showTemporaryMessage('图片处理完成！');
          },

          fileToDataUrl(file) {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                console.log(`[归墟背景] FileReader成功读取文件，DataURL长度: ${e.target.result.length}`);
                resolve(e.target.result);
              };
              reader.onerror = (error) => {
                console.error(`[归墟背景] FileReader读取失败:`, error);
                reject(error);
              };
              reader.readAsDataURL(file);
            });
          },

          // 新增：图片压缩函数
          compressImage(file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) {
            return new Promise((resolve, reject) => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const img = new Image();

              img.onload = () => {
                try {
                  // 计算压缩后的尺寸
                  let { width, height } = img;
                  
                  if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                  }

                  canvas.width = width;
                  canvas.height = height;

                  // 绘制压缩后的图片
                  ctx.drawImage(img, 0, 0, width, height);

                  // 转换为DataURL
                  const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                  
                  console.log(`[归墟背景] 图片压缩完成: ${img.naturalWidth}x${img.naturalHeight} -> ${width}x${height}, 质量: ${quality}`);
                  resolve(compressedDataUrl);
                } catch (error) {
                  console.error(`[归墟背景] 图片压缩过程中出错:`, error);
                  reject(error);
                }
              };

              img.onerror = (error) => {
                console.error(`[归墟背景] 图片加载失败:`, error);
                reject(new Error('图片加载失败'));
              };

              // 创建图片URL
              const url = URL.createObjectURL(file);
              img.src = url;
              
              // 清理URL - 修正onload处理
              const originalOnload = img.onload;
              img.onload = () => {
                URL.revokeObjectURL(url);
                originalOnload();
              };
            });
          },

          // 新增：为大图片创建Object URL的处理方式
          createObjectUrlForLargeImage(file) {
            return new Promise((resolve, reject) => {
              try {
                // 创建Object URL
                const objectUrl = URL.createObjectURL(file);
                
                // 验证URL是否有效
                const img = new Image();
                img.onload = () => {
                  console.log(`[归墟背景] Object URL创建成功: ${objectUrl}`);
                  resolve(objectUrl);
                };
                img.onerror = () => {
                  URL.revokeObjectURL(objectUrl);
                  reject(new Error('Object URL验证失败'));
                };
                img.src = objectUrl;
              } catch (error) {
                console.error(`[归墟背景] Object URL创建失败:`, error);
                reject(error);
              }
            });
          },


                     async storeAvatarInDB(record) {
                         try {
                             const db = await this.initDB();
                             const transaction = db.transaction(['character_avatars'], 'readwrite');
                             const store = transaction.objectStore('character_avatars');
          
                             const getRequest = store.get(record.characterName);
          
                             getRequest.onsuccess = () => {
                                 const existingRecord = getRequest.result || {};
                                 
                                 const finalRecord = {
                                     characterName: record.characterName,
                                     avatarImage: record.avatarImage !== undefined ? record.avatarImage : existingRecord.avatarImage,
                                     backgroundImage: record.backgroundImage !== undefined ? record.backgroundImage : existingRecord.backgroundImage,
                                     backgroundOpacity: record.backgroundOpacity !== undefined ? record.backgroundOpacity : existingRecord.backgroundOpacity || 0.5,
                                     timestamp: Date.now()
                                 };
          
                                 const putRequest = store.put(finalRecord);
                                 putRequest.onerror = () => {
                                     console.error('Failed to store avatar in DB:', putRequest.error);
                                 };
                             };
                             getRequest.onerror = () => {
                                  console.error('Failed to get existing avatar record for update:', getRequest.error);
                             };
          
                         } catch (error) {
                             console.error('Failed to open DB for storing avatar:', error);
                         }
                     },
          
                     async getAvatarFromDB(characterName) {
                         try {
                             const db = await this.initDB();
                             const transaction = db.transaction(['character_avatars'], 'readonly');
                             const store = transaction.objectStore('character_avatars');
                             const getRequest = store.get(characterName);
                             return new Promise((resolve, reject) => {
                                 getRequest.onsuccess = () => resolve(getRequest.result);
                                 getRequest.onerror = () => reject(getRequest.error);
                             });
                         } catch (error) {
                             console.error('Failed to get avatar from DB:', error);
                             return null; // 出错时返回null以防止调用者崩溃
                         }
                     },

          previewBackground(bgId) {
            const bg = this.backgroundImages.find(b => b.id === bgId);
            if (!bg) return;

            // 创建预览模态框
            this.showImagePreviewModal(bg);
          },

          showImagePreviewModal(bg) {
            // 创建预览模态框
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.display = 'flex';
            modal.style.zIndex = '2001'; // 确保在背景设置模态框之上
            modal.innerHTML = `
              <div class="modal-content" style="width: 90vw; height: 90vh; max-width: none; max-height: none; padding: 0; background: rgba(0,0,0,0.9); display: flex; flex-direction: column;">
                <div class="modal-header" style="padding: 15px; background: rgba(26, 26, 46, 0.95); flex-shrink: 0;">
                  <h2 class="modal-title">预览：${bg.name}</h2>
                  <button class="modal-close-btn" id="preview-close-btn">&times;</button>
                </div>
                <div class="modal-body" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px; overflow: hidden; min-height: 0;">
                  <img src="${bg.dataUrl}" alt="${bg.name}" style="max-width: calc(100% - 20px); max-height: calc(100% - 20px); object-fit: contain; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                </div>
              </div>
            `;

            const container = document.querySelector('.guixu-root-container');
            if (container) {
              container.appendChild(modal);

              // 绑定关闭事件
              const closeBtn = modal.querySelector('#preview-close-btn');
              const closeModal = () => {
                modal.remove();
              };

              if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
              }

              // 点击背景关闭
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  closeModal();
                }
              });

              // ESC键关闭
              const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                  closeModal();
                  document.removeEventListener('keydown', handleKeydown);
                }
              };
              document.addEventListener('keydown', handleKeydown);

              this.showTemporaryMessage(`正在预览：${bg.name}`);
            }
          },

          selectBackground(bgId) {
            const bg = this.backgroundImages.find(b => b.id === bgId);
            if (!bg) return;

            this.selectedBackgroundId = bgId;
            this.backgroundMode = 'fixed'; // 选择背景时自动切换到固定模式
            this.saveBackgroundSettings();
            this.updateBackgroundModeUI();
            this.renderBackgroundList();
            this.applyRandomBackground(); // 应用选中的背景
            this.showTemporaryMessage(`已选择背景：${bg.name}`);
          },

          deleteBackground(bgId) {
            const bg = this.backgroundImages.find(b => b.id === bgId);
            if (!bg) return;

            this.showCustomConfirm(`确定要删除背景图"${bg.name}"吗？`, () => {
              this.backgroundImages = this.backgroundImages.filter(b => b.id !== bgId);
              
              // 如果删除的是当前选中的背景，清除选择
              if (this.selectedBackgroundId === bgId) {
                this.selectedBackgroundId = null;
              }
              
              this.saveBackgroundSettings();
              this.renderBackgroundList();
              this.applyRandomBackground(); // 重新应用背景
              this.showTemporaryMessage(`已删除背景图：${bg.name}`);
            }, null, true); // keepCurrentModal = true
          },

          saveBackgroundSettings() {
            try {
              const settings = {
                images: this.backgroundImages,
                mode: this.backgroundMode,
                selectedId: this.selectedBackgroundId
              };
              localStorage.setItem('guixu_background_settings', JSON.stringify(settings));
            } catch (e) {
              console.error('保存背景图设置失败:', e);
            }
          },

          loadBackgroundSettings() {
            try {
              const saved = localStorage.getItem('guixu_background_settings');
              if (saved) {
                const settings = JSON.parse(saved);
                this.backgroundImages = settings.images || [];
                this.backgroundMode = settings.mode || 'random';
                this.selectedBackgroundId = settings.selectedId || null;
              }
            } catch (e) {
              console.error('加载背景图设置失败:', e);
              this.backgroundImages = [];
              this.backgroundMode = 'random';
              this.selectedBackgroundId = null;
            }
          },

          // --- 新增：处理外链图床添加 ---
          async handleUrlImageAdd() {
            const urlInput = document.getElementById('image-url-input');
            
            if (!urlInput) {
              this.showTemporaryMessage('找不到URL输入框');
              return;
            }
            
            const inputText = urlInput.value.trim();
            const baseName = ''; // 使用空字符串，让系统自动生成名称
            
            // 验证输入
            if (!inputText) {
              this.showTemporaryMessage('请输入图片链接');
              return;
            }
            
            // 分割多行输入，支持多个链接
            const imageUrls = inputText.split('\n')
              .map(url => url.trim())
              .filter(url => url.length > 0);
            
            if (imageUrls.length === 0) {
              this.showTemporaryMessage('请输入有效的图片链接');
              return;
            }
            
            // 验证所有链接格式
            const invalidUrls = imageUrls.filter(url => !this.isValidImageUrl(url));
            if (invalidUrls.length > 0) {
              this.showTemporaryMessage(`以下链接格式无效（需要以 https:// 开头）：\n${invalidUrls.slice(0, 3).join('\n')}${invalidUrls.length > 3 ? '\n...' : ''}`);
              return;
            }
            
            // 检查重复链接
            const existingUrls = imageUrls.filter(url =>
              this.backgroundImages.some(bg => bg.dataUrl === url)
            );
            if (existingUrls.length > 0) {
              this.showTemporaryMessage(`以下链接已存在：\n${existingUrls.slice(0, 3).join('\n')}${existingUrls.length > 3 ? '\n...' : ''}`);
              return;
            }
            
            this.showTemporaryMessage(`正在验证 ${imageUrls.length} 个图片链接...`, 5000);
            
            let successCount = 0;
            let failedUrls = [];
            
            // 批量处理图片链接
            for (let i = 0; i < imageUrls.length; i++) {
              const imageUrl = imageUrls[i];
              
              try {
                // 验证图片链接是否有效
                const isValid = await this.validateImageUrl(imageUrl);
                if (!isValid) {
                  failedUrls.push(imageUrl);
                  continue;
                }
                
                // 生成图片名称
                let finalName;
                if (baseName) {
                  finalName = imageUrls.length > 1 ? `${baseName}_${i + 1}` : baseName;
                } else {
                  finalName = this.extractNameFromUrl(imageUrl);
                }
                
                // 创建新的背景图对象
                const bgId = 'url_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const newBackground = {
                  id: bgId,
                  name: finalName,
                  dataUrl: imageUrl,
                  uploadTime: new Date().toISOString(),
                  isPreset: false,
                  isUrlImage: true, // 标记为外链图片
                  originalUrl: imageUrl
                };
                
                // 测试存储空间
                const tempImages = [...this.backgroundImages, newBackground];
                const testSettings = {
                  images: tempImages,
                  mode: this.backgroundMode,
                  selectedId: this.selectedBackgroundId
                };
                
                try {
                  const testData = JSON.stringify(testSettings);
                  if (testData.length > 4 * 1024 * 1024) {
                    throw new Error('存储空间不足');
                  }
                  
                  localStorage.setItem('guixu_background_test', testData);
                  localStorage.removeItem('guixu_background_test');
                  
                  // 保存成功
                  this.backgroundImages.push(newBackground);
                  successCount++;
                  
                  console.log(`[归墟背景] 成功添加外链图片: ${finalName}, URL: ${imageUrl}`);
                  
                } catch (storageError) {
                  console.error('[归墟背景] 存储外链图片失败:', storageError);
                  failedUrls.push(imageUrl);
                }
                
              } catch (error) {
                console.error('[归墟背景] 验证外链图片失败:', error);
                failedUrls.push(imageUrl);
              }
            }
            
            // 保存设置
            if (successCount > 0) {
              this.saveBackgroundSettings();
              
              // 清空输入框
              urlInput.value = '';
              
              // 刷新列表
              if (document.getElementById('background-settings-modal').style.display === 'flex') {
                this.renderBackgroundList();
              }
            }
            
            // 显示结果消息
            if (successCount === imageUrls.length) {
              this.showTemporaryMessage(`成功添加 ${successCount} 张外链图片！`);
            } else if (successCount > 0) {
              this.showTemporaryMessage(`成功添加 ${successCount} 张图片，${failedUrls.length} 张失败`);
            } else {
              this.showTemporaryMessage('所有图片链接都添加失败，请检查链接是否正确');
            }
          },

          // --- 新增：验证图片URL格式 ---
          isValidImageUrl(url) {
            try {
              const urlObj = new URL(url);
              // 必须是 https 协议
              if (urlObj.protocol !== 'https:') {
                return false;
              }
              // 检查是否是常见的图片扩展名或图床域名
              const pathname = urlObj.pathname.toLowerCase();
              const hostname = urlObj.hostname.toLowerCase();
              
              // 常见图片扩展名
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
              const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
              
              // 常见图床域名
              const imagehostDomains = [
                'imgur.com', 'i.imgur.com',
                'postimg.cc', 'i.postimg.cc',
                'sm.ms', 'i.loli.net',
                'github.com', 'raw.githubusercontent.com',
                'cdn.jsdelivr.net', 'unpkg.com'
              ];
              const isImagehostDomain = imagehostDomains.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
              );
              
              return hasImageExtension || isImagehostDomain;
            } catch (e) {
              return false;
            }
          },

          // --- 新增：验证图片链接是否可访问 ---
          validateImageUrl(url) {
            return new Promise((resolve) => {
              const img = new Image();
              const timeout = setTimeout(() => {
                resolve(false);
              }, 10000); // 10秒超时
              
              img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
              };
              
              img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
              };
              
              // 设置跨域属性以避免CORS问题
              img.crossOrigin = 'anonymous';
              img.src = url;
            });
          },

          // --- 新增：从URL提取文件名 ---
          extractNameFromUrl(url) {
            try {
              const urlObj = new URL(url);
              const pathname = urlObj.pathname;
              const filename = pathname.split('/').pop();
              
              if (filename && filename.includes('.')) {
                // 移除扩展名
                return filename.replace(/\.[^/.]+$/, '') || '外链图片';
              }
              
              // 如果无法提取文件名，使用域名
              return urlObj.hostname.replace('www.', '') || '外链图片';
            } catch (e) {
              return '外链图片';
            }
          },

          // --- 新增：显示图床链接管理模态框 ---
          showUrlImagesManageModal() {
            this.openModal('url-images-manage-modal');
            this.renderUrlImagesList();
          },

          // --- 新增：渲染外链图片列表 ---
          renderUrlImagesList() {
            const listContainer = document.getElementById('url-images-list');
            const countSpan = document.getElementById('url-images-count');
            if (!listContainer || !countSpan) return;

            // 筛选出外链图片
            const urlImages = this.backgroundImages.filter(bg => bg.isUrlImage);
            countSpan.textContent = `(${urlImages.length}张)`;

            if (urlImages.length === 0) {
              listContainer.innerHTML = '<div style="text-align: center; color: #8b7355; padding: 40px 20px;">暂无外链图片</div>';
              return;
            }

            listContainer.innerHTML = '';

            urlImages.forEach(bg => {
              const item = document.createElement('div');
              item.className = 'url-image-item';
              item.style.cssText = `
                display: flex; align-items: center; padding: 12px; margin-bottom: 8px;
                background: rgba(26, 26, 46, 0.6); border: 1px solid rgba(201, 170, 113, 0.2);
                border-radius: 6px; transition: all 0.2s ease;
              `;

              item.innerHTML = `
                <div style="flex-shrink: 0; width: 60px; height: 60px; margin-right: 12px; border-radius: 4px; overflow: hidden; background: rgba(0,0,0,0.3);">
                  <img src="${bg.dataUrl}" alt="${bg.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="color: #e0dcd1; font-size: 14px; font-weight: 500; margin-bottom: 4px; word-break: break-all;">
                    ${bg.name}
                  </div>
                  <div style="color: #8b7355; font-size: 11px; word-break: break-all; line-height: 1.3;">
                    ${bg.originalUrl}
                  </div>
                  <div style="color: #8b7355; font-size: 10px; margin-top: 2px;">
                    添加时间: ${new Date(bg.uploadTime).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div style="flex-shrink: 0; display: flex; gap: 6px; margin-left: 12px;">
                  <button class="url-image-btn edit-name-btn" data-bg-id="${bg.id}" 
                          style="padding: 4px 8px; font-size: 11px; background: rgba(201, 170, 113, 0.2); 
                                 border: 1px solid rgba(201, 170, 113, 0.3); border-radius: 3px; 
                                 color: #c9aa71; cursor: pointer; transition: all 0.2s ease;">
                    重命名
                  </button>
                  <button class="url-image-btn preview-btn" data-bg-id="${bg.id}"
                          style="padding: 4px 8px; font-size: 11px; background: rgba(76, 175, 80, 0.2); 
                                 border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 3px; 
                                 color: #4caf50; cursor: pointer; transition: all 0.2s ease;">
                    预览
                  </button>
                  <button class="url-image-btn delete-btn" data-bg-id="${bg.id}"
                          style="padding: 4px 8px; font-size: 11px; background: rgba(244, 67, 54, 0.2); 
                                 border: 1px solid rgba(244, 67, 54, 0.3); border-radius: 3px; 
                                 color: #f44336; cursor: pointer; transition: all 0.2s ease;">
                    删除
                  </button>
                </div>
              `;

              // 添加悬停效果
              item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(26, 26, 46, 0.8)';
                item.style.borderColor = 'rgba(201, 170, 113, 0.4)';
              });

              item.addEventListener('mouseleave', () => {
                item.style.background = 'rgba(26, 26, 46, 0.6)';
                item.style.borderColor = 'rgba(201, 170, 113, 0.2)';
              });

              listContainer.appendChild(item);
            });

            // 绑定按钮事件
            this.bindUrlImageListEvents();
          },

          // --- 新增：绑定外链图片列表事件 ---
          bindUrlImageListEvents() {
            const listContainer = document.getElementById('url-images-list');
            if (!listContainer) return;

            // 移除旧的事件监听器
            if (this.urlImageListClickHandler) {
              listContainer.removeEventListener('click', this.urlImageListClickHandler);
            }

            // 创建新的事件处理器
            this.urlImageListClickHandler = (e) => {
              const bgId = e.target.dataset.bgId;
              if (!bgId) return;

              if (e.target.classList.contains('edit-name-btn')) {
                this.showEditImageNameModal(bgId);
              } else if (e.target.classList.contains('preview-btn')) {
                this.previewBackground(bgId);
              } else if (e.target.classList.contains('delete-btn')) {
                this.deleteUrlImage(bgId);
              }
            };

            // 绑定新的事件监听器
            listContainer.addEventListener('click', this.urlImageListClickHandler);
          },

          // --- 新增：显示编辑图片名称模态框 ---
          showEditImageNameModal(bgId) {
            const bg = this.backgroundImages.find(b => b.id === bgId);
            if (!bg) return;

            const input = document.getElementById('edit-image-name-input');
            const saveBtn = document.getElementById('save-image-name-btn');
            
            if (!input || !saveBtn) return;

            // 设置当前名称
            input.value = bg.name;
            
            // 移除旧的事件监听器
            if (this.saveImageNameHandler) {
              saveBtn.removeEventListener('click', this.saveImageNameHandler);
            }

            // 创建新的保存事件处理器
            this.saveImageNameHandler = () => {
              const newName = input.value.trim();
              if (!newName) {
                this.showTemporaryMessage('图片名称不能为空');
                return;
              }

              // 更新图片名称
              bg.name = newName;
              this.saveBackgroundSettings();
              
              // 刷新列表
              this.renderUrlImagesList();
              
              // 如果背景设置模态框也是打开的，也刷新那个列表
              if (document.getElementById('background-settings-modal').style.display === 'flex') {
                this.renderBackgroundList();
              }
              
              // 刷新UI界面的背景图列表
              this.renderBackgroundList();

              this.closeModal('edit-image-name-modal');
              this.showTemporaryMessage(`图片名称已更新为：${newName}`);
            };

            // 绑定保存事件
            saveBtn.addEventListener('click', this.saveImageNameHandler);

            // 绑定回车键保存
            const handleEnterKey = (e) => {
              if (e.key === 'Enter') {
                this.saveImageNameHandler();
                input.removeEventListener('keypress', handleEnterKey);
              }
            };
            input.addEventListener('keypress', handleEnterKey);

            // 打开模态框并聚焦输入框
            this.openModal('edit-image-name-modal');
            setTimeout(() => {
              input.focus();
              input.select();
            }, 100);
          },

          // --- 新增：删除外链图片 ---
          deleteUrlImage(bgId) {
            const bg = this.backgroundImages.find(b => b.id === bgId);
            if (!bg) return;

            this.showCustomConfirm(`确定要删除外链图片"${bg.name}"吗？`, () => {
              this.backgroundImages = this.backgroundImages.filter(b => b.id !== bgId);
              
              // 如果删除的是当前选中的背景，清除选择
              if (this.selectedBackgroundId === bgId) {
                this.selectedBackgroundId = null;
              }
              
              this.saveBackgroundSettings();
              this.renderUrlImagesList();
              
              // 如果背景设置模态框也是打开的，也刷新那个列表
              if (document.getElementById('background-settings-modal').style.display === 'flex') {
                this.renderBackgroundList();
              }
              
              this.applyRandomBackground(); // 重新应用背景
              this.showTemporaryMessage(`已删除外链图片：${bg.name}`);
            }, null, true); // keepCurrentModal = true
          },

          // 新增：绑定键盘快捷键
          bindKeyboardShortcuts() {
            // 将事件处理函数绑定到 this 并保存引用
            this.boundHandleKeydown = (e) => {
              // 检查快捷键是否已启用
              if (!this.isKeyboardShortcutsEnabled) {
                return; // 快捷键已禁用
              }

              // 检查是否在输入框中，如果是则不处理快捷键
              const activeElement = document.activeElement;
              const isInputField = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true' ||
                activeElement.isContentEditable
              );

              if (isInputField) {
                return; // 在输入框中时不处理快捷键
              }

              // 处理带修饰键的快捷键
              if (e.ctrlKey && !e.altKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                  case 'a':
                    e.preventDefault();
                    this.toggleLeftPanel();
                    console.log('[归墟快捷键] Ctrl+A - 切换左侧面板');
                    break;
                  case 'd':
                    e.preventDefault();
                    this.toggleRightPanel();
                    console.log('[归墟快捷键] Ctrl+D - 切换右侧面板');
                    break;
                }
                return; // 处理完修饰键快捷键后返回
              }

              // 防止其他修饰键组合干扰
              const isModifierPressed = e.ctrlKey || e.altKey || e.metaKey;
              if (isModifierPressed) {
                return; // 有其他修饰键时不处理
              }

              switch (e.key.toLowerCase()) {
                case 'e':
                  e.preventDefault();
                  this.toggleModal('inventory-modal', () => this.showInventory());
                  console.log('[归墟快捷键] E键 - 切换物品栏');
                  break;
                case 'r':
                  e.preventDefault();
                  this.toggleModal('relationships-modal', () => this.showRelationships());
                  console.log('[归墟快捷键] R键 - 切换人物关系');
                  break;
                case 'd':
                  e.preventDefault();
                  this.toggleModal('save-load-modal', () => this.showSaveLoadManager());
                  console.log('[归墟快捷键] D键 - 切换存档管理器');
                  break;
                case 't':
                  e.preventDefault();
                  this.toggleModal('settings-modal', () => this.showSettings());
                  console.log('[归墟快捷键] T键 - 切换设置界面');
                  break;
              }
            };
            document.addEventListener('keydown', this.boundHandleKeydown);

            console.log('[归墟快捷键] 键盘快捷键绑定完成');
            console.log('[归墟快捷键] E-背包, R-人物关系, D-存档读档, T-设置, Ctrl+A/D-面板折叠');
          },

          // 新增：模态框切换函数
          toggleModal(modalId, showFunction) {
            const modal = document.getElementById(modalId);
            if (modal && modal.style.display === 'flex') {
              // 如果模态框已经打开，则关闭它
              this.closeModal(modalId);
            } else {
              // 如果模态框未打开，则打开它
              showFunction();
            }
          },

          // 新增：键盘快捷键详情折叠/展开函数
          toggleKeyboardShortcutsDetails() {
            const details = document.getElementById('keyboard-shortcuts-details');
            const toggleButton = document.getElementById('keyboard-shortcuts-toggle');
            
            if (details && toggleButton) {
              if (details.style.display === 'none' || details.style.display === '') {
                details.style.display = 'block';
                toggleButton.textContent = '▲';
                toggleButton.style.transform = 'rotate(180deg)';
              } else {
                details.style.display = 'none';
                toggleButton.textContent = '▼';
                toggleButton.style.transform = 'rotate(0deg)';
              }
            }
          },

          // --- 新增：处理小屏幕下输入框被输入法遮挡的问题 ---
          setupInputKeyboardHandling() {
            const inputField = document.getElementById('quick-send-input');
            if (!inputField) {
              console.error('[归墟输入法] 未找到输入框元素');
              return;
            }

            // 根据设置选择不同的处理方式
            if (this.isMobileInputAdaptEnabled) {
              // 新的输入框上移方案
              this.setupFloatingInput();
            } else {
              // 原有的视口调整方案
              this.setupViewportAdjustment();
            }
          },

          // 重新初始化键盘处理逻辑（用于开关切换时）
          reinitializeInputKeyboardHandling() {
            const inputField = document.getElementById('quick-send-input');
            if (!inputField) {
              console.error('[归墟输入法] 未找到输入框元素');
              return;
            }

            console.log('[归墟输入法] 重新初始化键盘处理，当前状态:', this.isMobileInputAdaptEnabled);

            // 清理现有的事件监听器
            this.cleanupInputKeyboardHandling();

            // 重新设置键盘处理
            this.setupInputKeyboardHandling();
          },

          // 清理键盘处理相关的事件监听器
          cleanupInputKeyboardHandling() {
            const inputField = document.getElementById('quick-send-input');
            if (!inputField) return;

            // 移除现有的事件监听器（通过克隆节点的方式）
            const newInputField = inputField.cloneNode(true);
            inputField.parentNode.replaceChild(newInputField, inputField);

            console.log('[归墟输入法] 已清理现有的事件监听器');
          },

          // 新方案：输入框上移到顶部
          setupFloatingInput() {
            const inputField = document.getElementById('quick-send-input');
            const sendButton = document.getElementById('btn-quick-send');
            const bottomBar = document.querySelector('.bottom-status-bar');
            
            if (!inputField) {
              console.error('[归墟输入法] 未找到输入框元素');
              return;
            }
            
            console.log('[归墟输入法] 初始化输入框上移功能');
            
            // 保存原始父元素和位置信息到实例变量
            this.originalParent = inputField.parentElement;
            this.originalNextSibling = inputField.nextSibling;
            
            // 将 moveInputToTop 作为实例方法
            this.moveInputToTop = () => {
              console.log('[归墟输入法] 开始移动输入框到顶部');
              
              const container = this.createFloatingContainer();
              console.log('[归墟输入法] 浮动容器已获取:', container);
              
              // 暂时保存输入框的值
              const inputValue = inputField.value;
              console.log('[归墟输入法] 保存输入框值:', inputValue);
              
              // 移动输入框到浮动容器
              container.appendChild(inputField);
              console.log('[归墟输入法] 输入框已添加到浮动容器');
              
              // 应用新样式 - 保持与原输入框相同的样式
              inputField.style.cssText = `
                background: rgba(0, 0, 0, 0.5) !important;
                border: 1px solid #8b7355 !important;
                border-radius: 4px !important;
                color: #e0dcd1 !important;
                padding: 5px 10px !important;
                font-size: 12px !important;
                width: 100% !important;
                flex-grow: 1 !important;
                max-width: 500px !important;
                height: 32px !important;
                resize: none !important;
                line-height: 1.5 !important;
                font-family: inherit !important;
                margin: 0 !important;
              `;
              
              // 移除焦点样式事件，保持原始样式
              inputField.onfocus = null;
              inputField.onblur = null;
              
              // 恢复输入框的值
              inputField.value = inputValue;
              
              // 只添加发送按钮，不添加历史记录按钮
              if (sendButton && sendButton.parentElement !== container) {
                const sendBtnClone = document.createElement('button');
                sendBtnClone.textContent = '发送';
                sendBtnClone.style.cssText = `
                  padding: 6px 4px !important;
                  background: linear-gradient(45deg, #1a1a2e, #2d1b3d) !important;
                  border: 1px solid #c9aa71 !important;
                  border-radius: 5px !important;
                  color: #c9aa71 !important;
                  font-size: 10px !important;
                  cursor: pointer !important;
                  text-align: center !important;
                  transition: all 0.3s ease !important;
                  white-space: nowrap !important;
                `;
                sendBtnClone.onmouseover = () => {
                  sendBtnClone.style.background = 'linear-gradient(45deg, #2d1b3d, #3d2b4d)';
                };
                sendBtnClone.onmouseout = () => {
                  sendBtnClone.style.background = 'linear-gradient(45deg, #1a1a2e, #2d1b3d)';
                };
                sendBtnClone.onclick = () => {
                  // 触发原按钮的点击事件
                  sendButton.click();
                };
                container.appendChild(sendBtnClone);
                console.log('[归墟输入法] 发送按钮已添加（不包含历史记录按钮）');
              }
              
              // 显示容器动画
              setTimeout(() => {
                container.style.top = '0px';
                container.style.opacity = '1';
              }, 10);
              
              // 聚焦输入框
              setTimeout(() => {
                inputField.focus();
                console.log('[归墟输入法] 输入框已聚焦');
              }, 100);
              
              console.log('[归墟输入法] 输入框已移动到顶部');
            };

            // 监听焦点事件
            inputField.addEventListener('focus', (e) => {
              console.log('[归墟输入法] 输入框获得焦点，适配开关状态:', this.isMobileInputAdaptEnabled);
              console.log('[归墟输入法] 当前浮动容器状态:', this.floatingInputContainer);
              if (this.isMobileInputAdaptEnabled) {
                // 防止重复触发
                if (!this.floatingInputContainer || !this.floatingInputContainer.parentElement) {
                  console.log('[归墟输入法] 准备移动输入框到顶部');
                  this.moveInputToTop();
                } else {
                  console.log('[归墟输入法] 浮动容器已存在，跳过创建');
                }
              } else {
                console.log('[归墟输入法] 手机输入框适配未开启');
              }
            });

            inputField.addEventListener('blur', (e) => {
              console.log('[归墟输入法] 输入框失去焦点');
              if (this.isMobileInputAdaptEnabled && this.floatingInputContainer) {
                // 延迟检查，避免点击其他元素时立即收起
                setTimeout(() => {
                  // 检查焦点是否还在浮动容器内
                  const activeElement = document.activeElement;
                  const isInFloatingContainer = this.floatingInputContainer &&
                    (this.floatingInputContainer.contains(activeElement) || activeElement === inputField);
                  
                  if (!isInFloatingContainer) {
                    this.resetInputPosition();
                  }
                }, 200);
              }
            });

            console.log('[归墟输入法] 输入框上移方案已初始化');
          },

          // 创建浮动输入框容器（作为实例方法）
          createFloatingContainer() {
            if (this.floatingInputContainer && this.floatingInputContainer.parentElement) {
              console.log('[归墟输入法] 使用现有浮动容器');
              return this.floatingInputContainer;
            }
            
            this.floatingInputContainer = document.createElement('div');
            this.floatingInputContainer.className = 'floating-input-container';
            this.floatingInputContainer.style.cssText = `
              position: fixed !important;
              top: -60px !important;
              left: 0 !important;
              right: 0 !important;
              width: 100% !important;
              z-index: 999999 !important;
              background: transparent !important;
              padding: 10px 15px !important;
              display: flex !important;
              gap: 8px !important;
              align-items: center !important;
              opacity: 0 !important;
              visibility: visible !important;
              pointer-events: auto !important;
              transform: translateY(0) !important;
              transition: all 0.3s ease !important;
            `;
            
            // 检查是否在全屏模式下
            const isFullscreen = document.fullscreenElement !== null;
            const rootContainer = document.querySelector('.guixu-root-container');
            
            if (isFullscreen && rootContainer) {
              // 全屏模式下，添加到主界面容器内
              rootContainer.appendChild(this.floatingInputContainer);
              console.log('[归墟输入法] 全屏模式：浮动容器已添加到主界面容器内');
            } else {
              // 非全屏模式下，添加到body
              document.body.appendChild(this.floatingInputContainer);
              console.log('[归墟输入法] 非全屏模式：浮动容器已添加到body');
            }
            
            // 强制重绘
            this.floatingInputContainer.offsetHeight;
            
            console.log('[归墟输入法] 浮动容器已创建，全屏状态:', isFullscreen);
            
            return this.floatingInputContainer;
          },

          // 恢复输入框位置（作为实例方法）
          resetInputPosition() {
            console.log('[归墟输入法] 开始恢复输入框位置');
            
            const inputField = document.getElementById('quick-send-input');
            if (!this.floatingInputContainer || !inputField) return;
            
            // 隐藏容器
            this.floatingInputContainer.style.opacity = '0';
            this.floatingInputContainer.style.visibility = 'hidden';
            
            // 延迟恢复位置
            setTimeout(() => {
              // 保存输入框的值
              const inputValue = inputField.value;
              
              // 恢复输入框到原始位置
              if (this.originalNextSibling) {
                this.originalParent.insertBefore(inputField, this.originalNextSibling);
              } else {
                this.originalParent.appendChild(inputField);
              }
              
              // 恢复原始样式
              inputField.style.cssText = '';
              inputField.className = 'quick-send-input';
              
              // 恢复输入框的值
              inputField.value = inputValue;
              
              // 移除浮动容器中的克隆按钮
              const clonedButton = this.floatingInputContainer.querySelector('button:not(.close-floating-input)');
              if (clonedButton) {
                clonedButton.remove();
              }
              
              // 移除浮动容器
              if (this.floatingInputContainer && this.floatingInputContainer.parentElement) {
                this.floatingInputContainer.remove();
              }
              this.floatingInputContainer = null;
              
              console.log('[归墟输入法] 输入框已恢复到原位');
            }, 300);
          },

          // 原方案：视口调整
          setupViewportAdjustment() {
            const inputField = document.getElementById('quick-send-input');
            if (!inputField) {
              console.error('[归墟输入法] 未找到输入框元素');
              return;
            }

            let isKeyboardOpen = false;
            let originalHeight = window.innerHeight;
            let lastScrollPosition = 0;

            // 使用 Visual Viewport API（如果可用）
            const getViewportHeight = () => {
              if (window.visualViewport) {
                return window.visualViewport.height;
              }
              return window.innerHeight;
            };

            // 处理键盘显示/隐藏
            const handleKeyboardToggle = () => {
              const currentHeight = getViewportHeight();
              const heightDiff = originalHeight - currentHeight;
              
              // 键盘弹出（高度减少超过100px）
              if (heightDiff > 100 && !isKeyboardOpen) {
                isKeyboardOpen = true;
                this.adjustForKeyboard(true, heightDiff);
              }
              // 键盘收起（高度恢复）
              else if (heightDiff < 50 && isKeyboardOpen) {
                isKeyboardOpen = false;
                this.adjustForKeyboard(false, 0);
              }
            };

            // 监听输入框焦点事件
            inputField.addEventListener('focus', () => {
              // 保存当前滚动位置
              lastScrollPosition = window.scrollY;
              
              // 对于移动设备，延迟处理以等待键盘完全弹出
              setTimeout(() => {
                handleKeyboardToggle();
                this.ensureInputVisible();
              }, 300);
            });

            inputField.addEventListener('blur', () => {
              // 延迟处理键盘收起
              setTimeout(() => {
                if (document.activeElement !== inputField) {
                  isKeyboardOpen = false;
                  this.adjustForKeyboard(false, 0);
                  // 恢复滚动位置
                  window.scrollTo(0, lastScrollPosition);
                }
              }, 300);
            });

            // 监听视口变化
            if (window.visualViewport) {
              window.visualViewport.addEventListener('resize', handleKeyboardToggle);
              window.visualViewport.addEventListener('scroll', () => {
                if (isKeyboardOpen) {
                  this.ensureInputVisible();
                }
              });
            } else {
              // 降级方案：监听window resize
              window.addEventListener('resize', handleKeyboardToggle);
            }

            // 监听方向变化
            window.addEventListener('orientationchange', () => {
              setTimeout(() => {
                originalHeight = window.innerHeight;
                handleKeyboardToggle();
              }, 500);
            });

            console.log('[归墟输入法] 视口调整方案已初始化');
          },

          // 调整页面以适应虚拟键盘
          adjustForKeyboard(keyboardOpen, keyboardHeight) {
            const bottomBar = document.querySelector('.bottom-status-bar');
            const chatContainer = document.querySelector('.chat-container');
            const rootContainer = document.querySelector('.guixu-root-container');
            
            if (keyboardOpen && keyboardHeight > 0) {
              // 键盘弹出时的调整
              
              // 移动端特殊处理
              if (rootContainer && rootContainer.classList.contains('mobile-view')) {
                // 底部状态栏上移到键盘上方
                if (bottomBar) {
                  bottomBar.style.position = 'fixed';
                  bottomBar.style.bottom = `${keyboardHeight}px`;
                  bottomBar.style.left = '0';
                  bottomBar.style.right = '0';
                  bottomBar.style.zIndex = '10000';
                  bottomBar.style.transition = 'bottom 0.3s ease';
                }
                
                // 调整聊天容器底部间距
                if (chatContainer) {
                  const bottomBarHeight = bottomBar ? bottomBar.offsetHeight : 0;
                  chatContainer.style.paddingBottom = `${keyboardHeight + bottomBarHeight + 10}px`;
                  chatContainer.style.transition = 'padding-bottom 0.3s ease';
                }
              } else {
                // 桌面端简单处理
                if (bottomBar) {
                  bottomBar.style.position = 'fixed';
                  bottomBar.style.bottom = '0';
                  bottomBar.style.zIndex = '10000';
                }
                if (chatContainer) {
                  chatContainer.style.paddingBottom = '150px';
                }
              }
            } else {
              // 键盘收起时恢复
              if (bottomBar) {
                bottomBar.style.position = '';
                bottomBar.style.bottom = '';
                bottomBar.style.left = '';
                bottomBar.style.right = '';
                bottomBar.style.zIndex = '';
                bottomBar.style.transition = '';
              }
              if (chatContainer) {
                chatContainer.style.paddingBottom = '';
                chatContainer.style.transition = '';
              }
            }
          },

          // 确保输入框可见
          ensureInputVisible() {
            const inputField = document.getElementById('quick-send-input');
            const bottomBar = document.querySelector('.bottom-status-bar');
            
            if (inputField && bottomBar) {
              // 获取元素位置
              const inputRect = inputField.getBoundingClientRect();
              const viewportHeight = this.getViewportHeight();
              
              // 如果输入框不在可视区域内
              if (inputRect.bottom > viewportHeight || inputRect.top < 0) {
                // 计算需要滚动的距离
                const scrollTarget = window.scrollY + inputRect.top - (viewportHeight / 2);
                
                // 平滑滚动到合适位置
                window.scrollTo({
                  top: scrollTarget,
                  behavior: 'smooth'
                });
              }
            }
          },

          // 获取视口高度的辅助函数
          getViewportHeight() {
            if (window.visualViewport) {
              return window.visualViewport.height;
            }
            return window.innerHeight;
          },
      

          // --- 新增：衍梦尘 Gacha系统 全套核心函数 ---

          showGachaSystem() {
              this.isFromGuixuSystem = true;
              this.openModal('gacha-modal', true); // 直接打开模态框
              this.renderSummonTab(); // 直接渲染新的召唤UI，不再需要标签页逻辑
          },

          loadGachaState() {
              const defaultState = {
                  // 移除 mengChen 属性
                  pitySSR_char: 0, pitySR_char: 0,
                  pitySSR_item: 0, pitySR_item: 0, pitySSR_talent: 0, pitySR_talent: 0,
                  redeemedCodes: [],
                  activeCompanions: [],
                  activatedItems: [],
              };
              const savedState = AppStorage.loadData('gacha_state', defaultState);
              this.gachaState = Object.assign({}, defaultState, savedState);
              // 确保旧的 mengChen 属性被删除，以防旧存档干扰
              if (this.gachaState.mengChen) {
                  delete this.gachaState.mengChen;
              }
              this.gachaCollection = AppStorage.loadData('gacha_collection', {});
              this.gachaHistory = AppStorage.loadData('gacha_history', []);
          },

          saveGachaState() {
              AppStorage.saveData('gacha_state', this.gachaState);
              AppStorage.saveData('gacha_collection', this.gachaCollection);
              AppStorage.saveData('gacha_history', this.gachaHistory);
          },

          

          // 新增辅助函数(1)：更新整个Gacha模态框的背景
          _updateGachaBackground(bgUrl) {
              const modalContent = document.getElementById('gacha-modal-content');
              if (modalContent && bgUrl) {
                  const img = new Image();
                  img.onload = () => {
                      modalContent.style.backgroundImage = `url('${bgUrl}')`;
                  };
                  img.src = bgUrl;
              }
          },

          // 渲染单个卡池详情的辅助函数 (第二步)
          _renderGachaPool(poolType) {
              this.currentGachaPoolType = poolType;
              const displayContainer = document.getElementById('gacha-pool-display');
              if (!displayContainer) return;

              const poolData = {
                  character: { title: '镜花水月 (角色池)', cost: 320, pitySSR: this.gachaState.pitySSR_char, pitySR: this.gachaState.pitySR_char, bg: 'https://i.postimg.cc/nL2MHDb9/5-1092332438545527-00001.webp' },
                  item: { title: '万象奇珍 (道具池)', cost: 160, pitySSR: this.gachaState.pitySSR_item, pitySR: this.gachaState.pitySR_item, bg: 'https://i.postimg.cc/1zsfhKTZ/5-240419165630629-00001.webp' },
                  talent: { title: '天命灵根 (天赋池)', cost: 160, pitySSR: this.gachaState.pitySSR_talent, pitySR: this.gachaState.pitySR_talent, bg: 'https://i.postimg.cc/GhTBktY6/5-683047889198109-00001.webp' }
              };
              const currentPool = poolData[poolType];

              this._updateGachaBackground(currentPool.bg);

              displayContainer.innerHTML = `
                  <div class="summon-container">
                      <div class="summon-header-info"></div> 
                      <div class="summon-main-controls">
                          <h3 class="pool-title">${currentPool.title}</h3>
                          <p style="font-size:12px; color:#a09c91;">SSR保底: ${currentPool.pitySSR}/90 | SR保底: ${currentPool.pitySR}/10</p>
                          <div class="summon-buttons">
                              <button id="gacha-pull-1" class="interaction-btn">召唤1次 (${currentPool.cost} 梦尘)</button>
                              <button id="gacha-pull-10" class="interaction-btn primary-btn">召唤10次 (${currentPool.cost * 10} 梦尘)</button>
                          </div>
                      </div>
                  </div>
              `;

              document.getElementById('gacha-pull-1').addEventListener('click', () => this.handlePull(1, poolType));
              document.getElementById('gacha-pull-10').addEventListener('click', () => this.handlePull(10, poolType));

              document.querySelectorAll('.pool-switch-btn').forEach(btn => {
                  btn.classList.toggle('active', btn.dataset.pool === poolType);
              });

              // 核心修复：每次切换卡池时，都为图鉴按钮重新绑定带有正确上下文的事件
              const galleryBtn = document.getElementById('btn-gacha-gallery-new');
              if (galleryBtn) {
                  const newBtn = galleryBtn.cloneNode(true); // 克隆按钮以移除旧监听器
                  galleryBtn.parentNode.replaceChild(newBtn, galleryBtn);
                  newBtn.addEventListener('click', () => this.showGachaGalleryPopup(poolType));
              }
          },

     // 显示图鉴弹窗 (v4 - 修复重复加入 & 优化按钮状态)
          showGachaGalleryPopup(poolType) { // 核心修复：直接接收 poolType 参数
              if (!poolType) {
                  console.error('showGachaGalleryPopup 调用时缺少 poolType');
                  poolType = this.currentGachaPoolType; // 提供一个回退
              }
              this.openModal('gacha-gallery-popup', true);
               // const poolType = this.currentGachaPoolType; // 不再从全局状态读取
              const poolData = {
                  character: { title: '镜花水月', bg: 'https://i.postimg.cc/nL2MHDb9/5-1092332438545527-00001.webp' },
                  item: { title: '万象奇珍', bg: 'https://i.postimg.cc/1zsfhKTZ/5-240419165630629-00001.webp' },
                  talent: { title: '天命灵根', bg: 'https://i.postimg.cc/GhTBktY6/5-683047889198109-00001.webp' }
              };
              const currentPool = poolData[poolType];

              document.getElementById('gacha-gallery-title').textContent = `${currentPool.title} 图鉴`;

              const previewContainer = document.getElementById('gallery-pool-preview');
              previewContainer.innerHTML = `<div class="summon-container" style="background-image: url('${currentPool.bg}');"><h3 class="pool-title">${currentPool.title}</h3></div>`;

              const gridContainer = document.getElementById('gallery-obtained-grid');
              const allItems = [...(this.gachaPools[poolType]?.ssr || []), ...(this.gachaPools[poolType]?.sr || []), ...(this.gachaPools[poolType]?.r || [])];

              const renderContent = (isObtainedOnly) => {
                  const itemsToRender = isObtainedOnly ? allItems.filter(item => this.gachaCollection[item.id]) : allItems;

                  if (itemsToRender.length === 0) {
                      gridContainer.innerHTML = `<p style='text-align:center; color:#8b7355; padding-top: 40px;'>${isObtainedOnly ? '此卡池暂无已获得的项目' : '此卡池内容为空'}</p>`;
                      return;
                  }

                  let gridHtml = '';
                  if (poolType === 'character') {
                      itemsToRender.forEach(item => {
                          const isUnlocked = this.gachaCollection[item.id];
                          const isActive = this.gachaState.activeCompanions.some(c => c.id === item.id);
                          const isQueued = this.pendingActions.some(a => a.itemName === item.名称);
                          let buttonHtml = '';
                          if (isUnlocked) {
                              if (isActive) buttonHtml = `<button class="gallery-join-world-btn" disabled>已加入</button>`;
                              else if (isQueued) buttonHtml = `<button class="gallery-join-world-btn" disabled>指令队列中</button>`;
                              else buttonHtml = `<button class="gallery-join-world-btn" data-item-id="${item.id}">加入世界</button>`;
                          }
                          const bgImageStyle = item.图片 ? `background-image: url('${item.图片}');` : '';
                          gridHtml += `
                              <div class="gallery-card rarity-${item.稀有度} ${isUnlocked ? 'unlocked' : 'gallery-card-locked'}" data-item-id="${item.id}">
                                  <div class="gallery-card-name">${item.名称}</div>
                                  ${buttonHtml}
                              </div>
                          `;
                      });
                      gridContainer.innerHTML = `<div class="gallery-grid">${gridHtml}</div>`;
                  } else {
                      itemsToRender.forEach(item => {
                          const isUnlocked = this.gachaCollection[item.id];
                          const isActive = this.gachaState.activatedItems.includes(item.id);
                          const isQueued = this.pendingActions.some(a => a.itemName === item.名称);
                          let buttonHtml = '';
                          if (isUnlocked) {
                              if (isActive) buttonHtml = `<button class="gallery-join-world-btn" disabled>已激活</button>`;
                              else if (isQueued) buttonHtml = `<button class="gallery-join-world-btn" disabled>指令队列中</button>`;
                              else buttonHtml = `<button class="gallery-join-world-btn" data-item-id="${item.id}" style="position: static; transform: none; opacity: 1; background: rgba(139,115,85,0.4);">加入指令</button>`;
                          }

                          gridHtml += `
                              <div class="gallery-text-item ${isUnlocked ? '' : 'gallery-text-item-locked'}" data-item-id="${item.id}">
                                  <div class="gallery-text-item-header">
                                      <span class="gallery-text-item-name rarity-${item.稀有度}">${item.名称} ${item.类型 ? `(${item.类型})` : ''}</span>
                                      <span class="gallery-text-item-rarity rarity-${item.稀有度}">${item.稀有度}</span>
                                  </div>
                                  <p class="gallery-text-item-desc">${item.描述}</p>
                                  ${isUnlocked ? `<div style="text-align: right; margin-top: 8px;">${buttonHtml}</div>` : ''}
                              </div>
                          `;
                      });
                      gridContainer.innerHTML = `<div class="gallery-text-grid">${gridHtml}</div>`;
                  }

                  gridContainer.querySelectorAll('.gallery-join-world-btn[data-item-id]').forEach(btn => {
                      btn.addEventListener('click', (e) => {
                          e.stopPropagation();
                          const itemId = e.target.dataset.itemId;
                          const itemData = allItems.find(i => i.id === itemId);
                          if(itemData) this.handleJoinWorld(itemData, poolType);
                      });
                  });
              };

              const container = document.querySelector('.gallery-obtained-container');
              const oldTabs = container.querySelector('.gallery-tab-nav');
              if (oldTabs) oldTabs.remove();
              const tabsHtml = `
                  <div class="gallery-tab-nav">
                      <button class="gallery-tab-btn" data-view="overview">卡池总览</button>
                      <button class="gallery-tab-btn" data-view="collection">我的收藏</button>
                  </div>
              `;
              container.insertAdjacentHTML('afterbegin', tabsHtml);

              const tabButtons = container.querySelectorAll('.gallery-tab-btn');
              tabButtons.forEach(btn => {
                  btn.addEventListener('click', () => {
                      tabButtons.forEach(b => b.classList.remove('active'));
                      btn.classList.add('active');
                      renderContent(btn.dataset.view === 'collection');
                  });
              });

              container.querySelector('.gallery-tab-btn[data-view="overview"]').click();
          },

   // --- 新增：衍梦尘设置面板全套函数 ---
          showGachaSettingsPopup() {
              this.openModal('gacha-settings-popup', true);
              const container = document.querySelector('#gacha-settings-popup .modal-body');
              if (!container) return;

              // 核心修改：将“角色档案”标签的文本改为“卡池档案”
              const archiveTab = container.querySelector('.gacha-settings-tab[data-tab="archives"]');
              if (archiveTab) archiveTab.textContent = '卡池档案';

              // 绑定标签页点击事件
              container.querySelectorAll('.gacha-settings-tab').forEach(tab => {
                  tab.addEventListener('click', () => {
                      container.querySelectorAll('.gacha-settings-tab').forEach(t => t.classList.remove('active'));
                      tab.classList.add('active');
                      this._renderGachaSettingsTab(tab.dataset.tab);
                  });
              });

              // 默认渲染第一个标签页
              this._renderGachaSettingsTab('command_center');
          },

          _renderGachaSettingsTab(tabName) {
              const contentContainer = document.getElementById('gacha-settings-content-container');
              if (!contentContainer) return;
              
              // 修复：在渲染新内容前，先清空并显示加载状态
              contentContainer.innerHTML = '<p style="color: #a09c91; padding: 20px;">正在加载...</p>';

              switch (tabName) {
                  case 'command_center':
                      this._renderSettingsCommandCenter(contentContainer);
                      break;
                  case 'archives':
                      this._renderSettingsArchives(contentContainer);
                      break;
                  case 'redeem':
                      this._renderSettingsRedeem(contentContainer);
                      break;
                  case 'pool_editor':
                      this._renderSettingsPoolEditor(contentContainer);
                      break;
              }
          },

          _renderSettingsCommandCenter(container) {
              let contentHtml = '<h3 class="settings-section-title">待处理指令</h3>';
              if (this.pendingActions.length === 0) {
                  contentHtml += '<p style="color: #a09c91; font-size: 13px;">当前没有待处理的指令。</p>';
              } else {
                  contentHtml += '<ul class="command-center-list">';
                  this.pendingActions.forEach(cmd => {
                      const actionText = this._formatActionText(cmd); // 核心修复：调用统一的格式化函数
                      if(actionText) contentHtml += `<li>${actionText}</li>`;
                  });
                  contentHtml += '</ul>';
                  contentHtml += '<button id="gacha-clear-pending" class="interaction-btn btn-danger" style="margin-top: 15px;">清空指令</button>';
              }
              container.innerHTML = contentHtml;

              const clearBtn = document.getElementById('gacha-clear-pending');
              if(clearBtn) {
                  clearBtn.addEventListener('click', () => {
                      this.pendingActions = [];
                      this.savePendingActions();
                      this._renderGachaSettingsTab('command_center'); // 刷新当前标签页
                      this.showTemporaryMessage('指令中心已清空');
                  });
              }
          },

          // “卡池档案”功能重构 (v5 - 简化并修复)
          _renderSettingsArchives(container) {
              container.innerHTML = '<p style="color: #a09c91;">正在加载卡池项目...</p>';
              
              const allPoolItems = [
                  ...Object.values(this.gachaPools.character || {}).flat(),
                  ...Object.values(this.gachaPools.item || {}).flat(),
                  ...Object.values(this.gachaPools.talent || {}).flat()
              ].filter(Boolean);

              if (allPoolItems.length === 0) {
                  container.innerHTML = '<p style="color: #a09c91; font-size: 13px;">“【归墟扩展】衍梦尘卡池”为空或未加载，请先在世界书中定义卡池内容。</p>';
                  return;
              }
              
              let contentHtml = '<h3 class="settings-section-title">卡池项目预览</h3>';
              contentHtml += '<p style="font-size: 12px; color: #a09c91; margin-top: -5px; margin-bottom: 15px;">此处列出所有在“【归墟扩展】衍梦尘卡池”世界书中定义的项目。</p>';

              for (const item of allPoolItems) {
                  contentHtml += `
                      <div class="character-archive-item">
                          <div class="archive-header">
                              <span class="archive-char-name" style="color: ${item.稀有度 === 'SSR' ? '#FFD700' : item.稀有度 === 'SR' ? '#C0C0C0' : '#CD7F32'};">${item.名称}</span>
                              <span style="font-size: 12px; color: #a09c91;">${item.类型} - ${item.稀有度}</span>
                          </div>
                          <div style="padding: 10px 15px; font-size: 13px; color: #d4d2c8;">${item.描述}</div>
                      </div>
                  `;
              }
              container.innerHTML = contentHtml;
          },

          // 新增：卡池编辑器UI渲染函数
          _renderSettingsPoolEditor(container) {
              let contentHtml = `
                  <div class="pool-editor-container">
                      <h3 class="settings-section-title">卡池编辑器</h3>
                      <p style="font-size: 12px; color: #a09c91; margin-top: -5px; margin-bottom: 15px;">在此管理“【归墟扩展】衍梦尘卡池”世界书的内容。</p>
                      <div class="pool-editor-controls">
                          <select id="pool-editor-select" class="quick-send-input">
                              <option value="character">[角色池]</option>
                              <option value="item">[道具池]</option>
                              <option value="talent">[天赋池]</option>
                          </select>
                          <button id="pool-editor-add-btn" class="interaction-btn primary-btn">添加新项目</button>
                      </div>
                      <div id="pool-editor-list-container" class="pool-editor-list">
                          <!-- 项目列表将在这里动态生成 -->
                      </div>
                  </div>
              `;
              container.innerHTML = contentHtml;

              // --- 事件绑定和初始化 ---
              const selectEl = document.getElementById('pool-editor-select');
              const addBtn = document.getElementById('pool-editor-add-btn');

              if (selectEl) {
                  selectEl.addEventListener('change', () => {
                      this._loadPoolEditorList(selectEl.value);
                  });
              }

              if (addBtn) {
                  addBtn.addEventListener('click', () => {
                      const poolType = selectEl ? selectEl.value : 'character';
                      this._addNewItemToEditor(poolType);
                  });
              }

              // 初始加载默认卡池
              this._loadPoolEditorList(selectEl ? selectEl.value : 'character');
          },

          // 新增：加载并渲染指定卡池的编辑器列表
          async _loadPoolEditorList(poolType) {
              const listContainer = document.getElementById('pool-editor-list-container');
              if (!listContainer) return;

              listContainer.innerHTML = '<p style="color: #a09c91;">正在从世界书加载项目...</p>';
              
              const poolCommentMapping = {
                  character: '[角色池]',
                  item: '[道具池]',
                  talent: '[天赋池]'
              };
              const targetComment = poolCommentMapping[poolType];
              
              try {
                  const bookName = '【归墟扩展】衍梦尘卡池';
                  const allEntries = await TavernHelper.getLorebookEntries(bookName);
                  const targetEntry = allEntries.find(e => e.comment === targetComment && e.enabled === false);

                  if (!targetEntry || !targetEntry.content) {
                      listContainer.innerHTML = '<p style-style="color: #8b7355;">未找到或卡池为空。您可以点击“添加新项目”来创建第一个条目。</p>';
                      return;
                  }

                  const itemBlocks = targetEntry.content.split(/\n*\s*名称:/).filter(block => block.trim() !== '');
                  if (itemBlocks.length === 0) {
                       listContainer.innerHTML = '<p style-style="color: #8b7355;">卡池为空。您可以点击“添加新项目”来创建第一个条目。</p>';
                      return;
                  }

                  listContainer.innerHTML = ''; // 清空
                  itemBlocks.forEach(block => {
                      const item = this._parseGachaPoolEntry('名称:' + block);
                      if (item) {
                          const itemElement = this._createEditorItemElement(item, poolType);
                          listContainer.appendChild(itemElement);
                      }
                  });

              } catch (e) {
                  console.error(`加载卡池 [${targetComment}] 失败:`, e);
                  listContainer.innerHTML = `<p style="color: #ff6b6b;">加载失败: ${e.message}</p>`;
              }
          },

          // 新增：从世界书中删除卡池项目
          async _deletePoolItem(itemName, poolType) {
              this.showTemporaryMessage(`正在删除“${itemName}”...`, 'info');
              const poolCommentMapping = {
                  character: '[角色池]',
                  item: '[道具池]',
                  talent: '[天赋池]'
              };
              const targetComment = poolCommentMapping[poolType];

              try {
                  const bookName = '【归墟扩展】衍梦尘卡池';
                  const allEntries = await TavernHelper.getLorebookEntries(bookName);
                  const targetEntry = allEntries.find(e => e.comment === targetComment && e.enabled === false);

                  if (!targetEntry) {
                      throw new Error('未找到对应的卡池条目。');
                  }

                  const itemBlocks = targetEntry.content.split(/\n*\s*名称:/).filter(block => block.trim() !== '');
                  const newBlocks = itemBlocks.filter(block => !('名称:' + block).trim().startsWith(`名称: ${itemName}`));
                  
                  if (newBlocks.length === itemBlocks.length) {
                      throw new Error('在卡池内容中未找到要删除的项目。');
                  }

                  const newContent = newBlocks.map(b => '名称: ' + b.trim()).join('\n\n');
                  
                  await TavernHelper.setLorebookEntries(bookName, [{ uid: targetEntry.uid, content: newContent }]);
                  
                  this.showTemporaryMessage('删除成功！', 'success');
                  this._loadPoolEditorList(poolType);
                  this.loadCharacterPoolFromLorebook();

              } catch (e) {
                  console.error('删除卡池项目失败:', e);
                  this.showTemporaryMessage(`删除失败: ${e.message}`, 'error');
              }
          },

          _addNewItemToEditor(poolType) {
              const listContainer = document.getElementById('pool-editor-list-container');
              if (!listContainer) return;
              
              // 检查是否已有新项目模板
              if (document.getElementById('new-item-editor')) {
                  this.showTemporaryMessage('请先保存或取消当前正在创建的项目。', 'warning');
                  return;
              }

              const newItemElement = this._createEditorItemElement(null, poolType);
              newItemElement.id = 'new-item-editor';
              listContainer.prepend(newItemElement);
              newItemElement.querySelector('details').open = true; // 默认展开
          },
          
          _createEditorItemElement(item, poolType) {
              const isNew = !item;
              const originalName = isNew ? '' : item.名称;
              const element = document.createElement('div');
              element.className = 'pool-editor-item';

              const rarityColor = `var(--tier-${(isNew ? 'R' : item.稀有度).toLowerCase()}, '#CD7F32')`;

              element.innerHTML = `
                  <details class="pool-editor-card" ${isNew ? 'open' : ''}>
                      <summary class="card-summary-header">
                          <div class="summary-info">
                            <span class="item-name-display">${isNew ? '【新项目】' : _.escape(item.名称)}</span>
                            <p class="item-description-display-summary">${isNew ? '点击此处折叠' : _.escape(item.描述)}</p>
                          </div>
                          <span class="item-rarity-display" style="color: ${rarityColor};">${isNew ? 'R' : _.escape(item.稀有度)}</span>
                      </summary>
                      <div class="card-editor-form">
                          <form class="pool-editor-form-inline">
                              <input type="hidden" name="originalName" value="${_.escape(originalName)}">
                              <input type="hidden" name="poolType" value="${poolType}">
                              <label><span>名称:</span> <input type="text" name="名称" class="stylish-input" value="${isNew ? '' : _.escape(item.名称)}" required></label>
                              <label><span>稀有度:</span>
                                  <div class="stylish-select-wrapper">
                                      <select name="稀有度" class="stylish-select" required>
                                          <option value="SSR" ${!isNew && item.稀有度 === 'SSR' ? 'selected' : ''}>SSR</option>
                                          <option value="SR" ${!isNew && item.稀有度 === 'SR' ? 'selected' : ''}>SR</option>
                                          <option value="R" ${!isNew && item.稀有度 === 'R' ? 'selected' : ''}>R</option>
                                      </select>
                                      <i class="arrow down"></i>
                                  </div>
                              </label>
                              <label><span>类型:</span> <input type="text" name="类型" class="stylish-input" value="${isNew ? '' : _.escape(item.类型)}" required></label>
                              <label><span>描述:</span> <textarea name="描述" class="stylish-input" rows="2" required>${isNew ? '' : _.escape(item.描述)}</textarea></label>
                              <label><span>详细信息 (世界书内容):</span> <textarea name="worldbookContent" class="stylish-input" rows="4">${isNew ? '' : _.escape(item.worldbookContent || '')}</textarea></label>
                              <div class="pool-editor-item-actions">
                                  ${!isNew ? `<button type="button" class="stylish-btn danger-btn btn-delete-item" data-name="${_.escape(item.名称)}">删除</button>` : ''}
                                  <button type="submit" class="stylish-btn primary-btn btn-save-item">保存</button>
                              </div>
                          </form>
                      </div>
                  </details>
              `;

              const details = element.querySelector('details');
              const form = element.querySelector('form');

              details.addEventListener('toggle', (event) => {
                  if (isNew && !details.open) {
                      element.remove();
                  }
              });

              form.addEventListener('submit', async (e) => {
                  e.preventDefault();
                  const formData = new FormData(form);
                  const saveData = Object.fromEntries(formData.entries());
                  const success = await this._savePoolItem(saveData);
                  if (success && !isNew) {
                      // 更新成功后，同步UI和表单内的原始名称
                      const summaryView = element.querySelector('.card-summary-header');
                      summaryView.querySelector('.item-name-display').textContent = saveData.名称;
                      summaryView.querySelector('.item-description-display-summary').textContent = saveData.描述;
                      summaryView.querySelector('.item-rarity-display').textContent = saveData.稀有度;
                      
                      const newRarityColor = `var(--tier-${saveData.稀有度.toLowerCase()}, '#CD7F32')`;
                      summaryView.querySelector('.item-rarity-display').style.color = newRarityColor;

                      // 核心修复：更新隐藏的originalName字段，以便下次编辑
                      form.querySelector('input[name="originalName"]').value = saveData.名称;
                      
                      details.open = false;
                  } else if (success && isNew) {
                      // 如果是新建项目且成功，列表会被刷新，这里不需要额外操作
                  }
              });

              const deleteBtn = element.querySelector('.btn-delete-item');
              if (deleteBtn) {
                  deleteBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      const itemName = deleteBtn.dataset.name;
                      if (confirm(`您确定要从 [${poolType}] 池中删除“${itemName}”吗？此操作不可撤销。`)) {
                          this._deletePoolItem(itemName, poolType);
                      }
                  });
              }
              return element;
          },

          // 新增：保存卡池项目到世界书
          async _savePoolItem(saveData) {
              this.showTemporaryMessage('正在保存到世界书...', 'info');
              const poolCommentMapping = {
                  character: '[角色池]',
                  item: '[道具池]',
                  talent: '[天赋池]'
              };
              const targetComment = poolCommentMapping[saveData.poolType];
              if (!targetComment) {
                  this.showTemporaryMessage('错误：无效的卡池类型！', 'error');
                  return false;
              }

              try {
                  const bookName = '【归墟扩展】衍梦尘卡池';
                  const allEntries = await TavernHelper.getLorebookEntries(bookName);
                  let targetEntry = allEntries.find(e => e.comment === targetComment && e.enabled === false);
                  
                  // --- 新增：重名检查逻辑 ---
                  if (targetEntry && saveData.名称 !== saveData.originalName) {
                      const existingNames = (targetEntry.content.match(/名称:\s*(.*)/g) || []).map(line => line.substring(line.indexOf(':') + 1).trim());
                      if (existingNames.includes(saveData.名称)) {
                          const overwrite = await this.showCustomConfirm(`已存在名为“${saveData.名称}”的项目。您想要覆盖它吗？`);
                          if (!overwrite) {
                              this.showTemporaryMessage('操作已取消', 'info');
                              return false;
                          }
                      }
                  }

                  let newContent = '';
                  const newItemBlock = `名称: ${saveData.名称}\n稀有度: ${saveData.稀有度}\n类型: ${saveData.类型}\n描述: ${saveData.描述}\n<详细信息>\n${saveData.worldbookContent}\n</详细信息>`;

                  if (targetEntry) {
                      const itemBlocks = targetEntry.content.split(/\n*\s*名称:/).filter(block => block.trim() !== '');
                      let itemFound = false;
                      
                      // 移除重名项（如果存在）和旧名项
                      const filteredBlocks = itemBlocks.filter(block => {
                          const currentName = ('名称:' + block).trim().match(/名称:\s*(.*?)\n/)[1];
                          return currentName !== saveData.名称 && currentName !== saveData.originalName;
                      });

                      const finalBlocks = filteredBlocks.map(b => '名称: ' + b.trim());
                      finalBlocks.push(newItemBlock);
                      newContent = finalBlocks.join('\n\n');
                      
                      await TavernHelper.setLorebookEntries(bookName, [{ uid: targetEntry.uid, content: newContent }]);
                  } else {
                      newContent = newItemBlock;
                      await TavernHelper.createLorebookEntries(bookName, [{ comment: targetComment, content: newContent, enabled: false }]);
                  }
                  
                  this.showTemporaryMessage('保存成功！', 'success');
                  this._loadPoolEditorList(saveData.poolType);
                  this.loadCharacterPoolFromLorebook();
                  return true;

              } catch (e) {
                  console.error('保存卡池项目失败:', e);
                  this.showTemporaryMessage(`保存失败: ${e.message}`, 'error');
                  return false;
              }
          },

          _renderSettingsRedeem(container) {
              container.innerHTML = `
                  <div class="redeem-container">
                      <h3 class="settings-section-title" style="text-align:center;">天道馈赠</h3>
                      <p style="color: #a09c91; font-size: 13px; max-width: 400px; margin: 15px auto;">在此输入神秘的真言以换取天道的馈赠。</p>
                      <div style="display: flex; gap: 10px; align-items: center; justify-content: center;">
                          <input type="text" id="redeem-code-input-settings" placeholder="输入兑换码" class="quick-send-input" style="width: 300px; height: 40px; text-align: center; font-size: 14px;">
                          <button id="btn-redeem-code-settings" class="interaction-btn primary-btn" style="padding: 10px 20px;">兑换</button>
                      </div>

                      
                      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed rgba(201, 170, 113, 0.3);">
                          <label style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; color: #ff6b6b;">
                              <input type="checkbox" id="gacha-cheat-mode-toggle" ${this.isGachaCheatMode ? 'checked' : ''}>
                              <strong>开启内测作弊模式 (无限梦尘)</strong>
                          </label>
                      </div>
                  </div>
              `;
              
              const redeemBtn = document.getElementById('btn-redeem-code-settings');
              const redeemInput = document.getElementById('redeem-code-input-settings');
              const cheatToggle = document.getElementById('gacha-cheat-mode-toggle'); // 获取新的开关元素

              redeemBtn.addEventListener('click', () => {
                  this.handleRedeemCode(redeemInput.value, () => {
                      redeemInput.value = ''; // 成功后清空
                      // 成功兑换后，刷新整个召唤界面的UI以显示最新的归墟点
                      this.renderSummonTab(this.currentGachaPoolType);
                  });
              });
              redeemInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') redeemBtn.click(); });

              // 新增：为作弊模式开关绑定事件
              if (cheatToggle) {
                  cheatToggle.addEventListener('change', (e) => {
                      this.isGachaCheatMode = e.target.checked;
                      this.saveGachaCheatState(); // 保存状态到本地存储
                      this.showTemporaryMessage(`作弊模式已${this.isGachaCheatMode ? '开启' : '关闭'}`);
                  });
              }
          },
  // 重构后的主函数 (第三步 v2)
          renderSummonTab(activePool = 'character') {
              // --- 核心修复：增加安全检查 ---
              if (!this.currentMvuState || !this.currentMvuState.stat_data) {
                  console.error('[衍梦尘] 无法渲染召唤界面：主游戏状态 (MVU) 未加载。');
                  const container = document.getElementById('gacha-main-container');
                  if (container) {
                      container.innerHTML = '<p style="text-align:center; color:#8b7355; padding: 50px;">无法加载角色数据，请先开始游戏或发送一条消息以初始化状态。</p>';
                  }
                  // 隐藏无关元素
                  const switcher = document.getElementById('gacha-pool-switcher-header');
                  const currency = document.getElementById('gacha-currency-header');
                  if(switcher) switcher.style.display = 'none';
                  if(currency) currency.style.display = 'none';
                  return; // 提前退出，防止崩溃
              }

              // 恢复被隐藏的元素
              const switcher = document.getElementById('gacha-pool-switcher-header');
              const currency = document.getElementById('gacha-currency-header');
              if(switcher) switcher.style.display = 'flex';
              if(currency) currency.style.display = 'block';

              const mainContainer = document.getElementById('gacha-main-container');
              const switcherContainer = document.getElementById('gacha-pool-switcher-header');
              const currencyContainer = document.getElementById('gacha-currency-header');
              if (!mainContainer || !switcherContainer || !currencyContainer) return;

              const poolInfo = {
                  character: { title: '镜花水月', bg: 'https://i.postimg.cc/nL2MHDb9/5-1092332438545527-00001.webp' },
                  item: { title: '万象奇珍', bg: 'https://i.postimg.cc/1zsfhKTZ/5-240419165630629-00001.webp' },
                  talent: { title: '天命灵根', bg: 'https://i.postimg.cc/GhTBktY6/5-683047889198109-00001.webp' }
              };

              let switcherHtml = '';
              for (const [poolType, data] of Object.entries(poolInfo)) {
                  switcherHtml += `<button class="pool-switch-btn" data-pool="${poolType}" data-title="${data.title}" style="background-image: url('${data.bg}');"></button>`;
              }
              switcherContainer.innerHTML = switcherHtml;

              const guixuPoints = this.SafeGetValue(this.currentMvuState.stat_data, '归墟点', 0);
              currencyContainer.innerHTML = `归墟点: <strong>${guixuPoints}</strong>`;

              mainContainer.innerHTML = `
                  <div id="gacha-pool-display" style="flex-grow: 1; display: flex;"></div>
                  <button id="btn-gacha-settings-new" class="gacha-corner-btn" title="设置">⚙️</button>
                  <button id="btn-gacha-gallery-new" class="gacha-corner-btn" title="图鉴">🖼️</button>
              `;

              switcherContainer.querySelectorAll('.pool-switch-btn').forEach(btn => {
                  btn.addEventListener('click', () => {
                      this._renderGachaPool(btn.dataset.pool);
                  });
              });

              document.getElementById('btn-gacha-settings-new').addEventListener('click', () => this.showGachaSettingsPopup());
              document.getElementById('btn-gacha-gallery-new').addEventListener('click', () => this.showGachaGalleryPopup(this.currentGachaPoolType));
              
              this._renderGachaPool(activePool);
          },

          // 新增：用于渲染文本类图鉴的辅助函数
          _renderTextBasedGrid(poolType) {
              const allItems = [...(this.gachaPools[poolType]?.ssr || []), ...(this.gachaPools[poolType]?.sr || []), ...(this.gachaPools[poolType]?.r || [])];
              if(allItems.length === 0) return '<p style="color: #a09c91; text-align: center; margin-top: 20px;">此图鉴暂无内容</p>';
              
              allItems.sort((a,b) => (b.稀有度 === 'SSR' ? 3 : b.稀有度 === 'SR' ? 2 : 1) - (a.稀有度 === 'SSR' ? 3 : a.稀有度 === 'SR' ? 2 : 1));
              
              let gridHtml = '';
              allItems.forEach(item => {
                  const isUnlocked = this.gachaCollection[item.id];
                  const rarity = item.稀有度 || 'R';
                  const name = item.名称 || '未知';
                  const desc = item.描述 || '暂无描述';
                  const type = item.类型 || '';

                  if (isUnlocked) {
                      gridHtml += `
                          <div class="gallery-text-item" data-item-id="${item.id}" data-pool-type="${poolType}">
                              <div class="gallery-text-item-header">
                                  <span class="gallery-text-item-name rarity-${rarity}">${name} ${type ? `(${type})` : ''}</span>
                                  <span class="gallery-text-item-rarity rarity-${rarity}">${rarity}</span>
                              </div>
                              <p class="gallery-text-item-desc">${desc}</p>
                          </div>
                      `;
                  } else {
                      gridHtml += `
                          <div class="gallery-text-item gallery-text-item-locked">
                              <div class="gallery-text-item-header">
                                  <span class="gallery-text-item-name">？？？</span>
                                  <span class="gallery-text-item-rarity rarity-${rarity}">${rarity}</span>
                              </div>
                              <p class="gallery-text-item-desc">尚未获得</p>
                          </div>
                      `;
                  }
              });
              return `<div class="gallery-text-grid">${gridHtml}</div>`;
          },

          renderGalleryTab() {
              const container = document.getElementById('gacha-tab-gallery');
              if(!container) return;
              const renderGrid = (poolType) => {
                  const allItems = [...(this.gachaPools[poolType]?.ssr || []), ...(this.gachaPools[poolType]?.sr || []), ...(this.gachaPools[poolType]?.r || [])];
                  if(allItems.length === 0) return '<p style="color: #a09c91; text-align: center; margin-top: 20px;">此图鉴暂无内容</p>';
                  allItems.sort((a,b) => (a.稀有度 === 'SSR' ? 3 : a.稀有度 === 'SR' ? 2 : 1) - (b.稀有度 === 'SSR' ? 3 : b.稀有度 === 'SR' ? 2 : 1));
                  let gridHtml = '';
                  allItems.forEach(item => {
                      const isUnlocked = this.gachaCollection[item.id];
                      const cardClass = `gallery-card rarity-${item.稀有度} ${isUnlocked ? 'unlocked' : 'gallery-card-locked'}`;
                      const bgImageStyle = isUnlocked && item.图片 ? `background-image: url('${item.图片}');` : '';
                      gridHtml += `<div class="${cardClass}" title="${item.名称}" data-item-id="${item.id}" data-pool-type="${poolType}" style="${bgImageStyle}">${isUnlocked ? `<div class="gallery-card-name">${item.名称}</div>` : ''}</div>`;
                  });
                  return `<div class="gallery-grid">${gridHtml}</div>`;
              }
              container.innerHTML = `
                  <details class="gallery-section" open><summary class="section-title">角色图鉴</summary>${renderGrid('character')}</details>
                  <details class="gallery-section" open><summary class=\"section-title\">道具图鉴</summary>${this._renderTextBasedGrid('item')}</details>
                  <details class=\"gallery-section\" open><summary class=\"section-title\">天赋图鉴</summary>${this._renderTextBasedGrid('talent')}</details>
              `;
             
              container.querySelectorAll('.gallery-grid, .gallery-text-grid').forEach(grid => {
                  grid.addEventListener('click', e => {
                      const card = e.target.closest('.gallery-card.unlocked, .gallery-text-item:not(.gallery-text-item-locked)');
                      if (!card) return;
                      const itemId = card.dataset.itemId;
                      const poolType = card.dataset.poolType;
                      const allItems = [...this.gachaPools[poolType].ssr, ...this.gachaPools[poolType].sr, ...this.gachaPools[poolType].r];
                      const itemData = allItems.find(i => i.id === itemId);
                      if (itemData) this.showGachaItemDetails(itemData, poolType);
                  });
              });
          },

          renderShopTab() {
              const container = document.getElementById('gacha-tab-shop');
              if (!container) return;
              container.innerHTML = `
                  <div class="shop-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 25px; padding: 20px; text-align: center;">
                      <h3 class="pool-title">天道馈赠</h3>
                      <p style="color: #a09c91; font-size: 13px; max-width: 400px;">在此输入神秘的真言以换取天道的馈赠。某些真言或许低语着大能的名讳，蕴含着莫大的机缘。</p>
                      <div style="display: flex; gap: 10px; align-items: center;">
                          <input type="text" id="redeem-code-input" placeholder="输入兑换码" class="quick-send-input" style="width: 300px; height: 40px; text-align: center; font-size: 14px;">
                          <button id="btn-redeem-code" class="interaction-btn primary-btn" style="padding: 10px 20px;">兑换</button>
                      </div>
                      
                  <div class="gacha-currency">当前梦尘: <strong>${this.gachaState.mengChen}</strong></div>
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px dashed rgba(201, 170, 113, 0.3);">
                      <label style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; color: #ff6b6b;">
                          <input type="checkbox" id="gacha-cheat-mode-toggle" ${this.isGachaCheatMode ? 'checked' : ''}>
                          <strong>开启内测作弊模式 (无限梦尘)</strong>
                      </label>
                  </div>
              </div>
              `;
              document.getElementById('btn-redeem-code').addEventListener('click', () => this.handleRedeemCode());
              document.getElementById('redeem-code-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') { document.getElementById('btn-redeem-code').click(); } });
 
              document.getElementById('gacha-cheat-mode-toggle').addEventListener('change', (e) => {
                  this.isGachaCheatMode = e.target.checked;
                  this.saveGachaCheatState();
                  this.showTemporaryMessage(`作弊模式已${this.isGachaCheatMode ? '开启' : '关闭'}`);
              });
         },

          handlePull(count, poolType) {
      // --- 核心修复：增加安全检查 ---
              if (!this.currentMvuState || !this.currentMvuState.stat_data) {
                  this.showTemporaryMessage('错误：角色数据未加载，无法进行召唤。');
                  return;
              }

        const costs = { character: 320, item: 160, talent: 160 };
              const cost = count * costs[poolType];
              const currentPoints = this.SafeGetValue(this.currentMvuState.stat_data, '归墟点', 0);

              if (!this.isGachaCheatMode) {
                  if (currentPoints < cost) {
                      this.showTemporaryMessage('归墟点不足！');
                      return;
                  }
                  // 不再直接扣除，而是生成指令
                  const command = `_.add('归墟点[0]', -${cost}); // 衍梦尘消耗`;
                  this.pendingActions.push({ action: 'variable_update', command: command, text: `[消耗] 归墟点 x ${cost}` });
                  this.savePendingActions();
                  this.showTemporaryMessage(`已将 [消耗 ${cost} 归墟点] 加入指令中心`);
              }
              
              // 乐观更新UI，让用户感觉点数已扣除
              const currencyContainer = document.getElementById('gacha-currency-header');
              if (currencyContainer) {
                  currencyContainer.innerHTML = `归墟点: <strong>${currentPoints - cost}</strong>`;
              }

              const results = [];
             let gotSR_or_above = false;
              for (let i = 0; i < count; i++) {
                  const result = this.getGachaRoll(poolType);
                  results.push(result);
                  if (result.rarity === 'SR' || result.rarity === 'SSR') gotSR_or_above = true;
              }
              if (count === 10 && !gotSR_or_above) {
                  results[Math.floor(Math.random() * 10)] = this.getRandomItemFromPool(poolType, ['sr']);
              }
              this.processPullResults(results, poolType);
              this.saveGachaState();
              // Bug修复：关闭结果窗口后，不再需要在这里刷新，因为关闭时会刷新
              // this.renderSummonTab(poolType);
          },

          getGachaRoll(poolType) {
              const pitySRKey = `pitySR_${poolType}`;
              const pitySSRKey = `pitySSR_${poolType}`;
              this.gachaState[pitySRKey]++;
              this.gachaState[pitySSRKey]++;
              if (this.gachaState[pitySSRKey] >= 90) return this.getSSRItem(poolType);
              if (this.gachaState[pitySRKey] >= 10) return this.getSRItem(poolType);
              const rand = Math.random();
              let softPityRate = this.gachaState[pitySSRKey] >= 74 ? (this.gachaState[pitySSRKey] - 73) * 0.06 : 0;
              if (rand < 0.006 + softPityRate) return this.getSSRItem(poolType);
              if (rand < 0.006 + softPityRate + 0.051) return this.getSRItem(poolType);
              return this.getRandomItemFromPool(poolType, ['r']);
          },

          getSSRItem(poolType) {
              this.gachaState[`pitySSR_${poolType}`] = 0;
              this.gachaState[`pitySR_${poolType}`] = 0;
              return this.getRandomItemFromPool(poolType, ['ssr']);
          },

          getSRItem(poolType) {
              this.gachaState[`pitySR_${poolType}`] = 0;
              return this.getRandomItemFromPool(poolType, ['sr']);
          },

          getRandomItemFromPool(poolType, rarities) {
              const pool = rarities.flatMap(r => this.gachaPools[poolType][r.toLowerCase()] || []);
              if (pool.length === 0) {
                  console.error(`[衍梦尘] 警告: 卡池 (${poolType} - ${rarities.join(', ')}) 为空。`);
                  return { id: 'fallback', 名称: '虚无之影', 稀有度: 'R', 类型: '错误' }; 
              }
              return pool[Math.floor(Math.random() * pool.length)];
          },

          processPullResults(results, poolType) {
              this.openModal('gacha-results-modal', true);
              const gridContainer = document.getElementById('gacha-results-grid');
              if (!gridContainer) return;
              gridContainer.innerHTML = '';
              gridContainer.className = results.length === 1 ? 'gacha-results-grid single-pull' : 'gacha-results-grid';
              results.forEach((res) => {
                  const isDuplicate = !!this.gachaCollection[res.id];
                  if (!isDuplicate) {
                      this.gachaCollection[res.id] = { acquired: new Date().toISOString() };
                  }
                  const dustReward = res.稀有度 === 'SSR' ? 80 : res.稀有度 === 'SR' ? 20 : 5;
                  if (isDuplicate) {
                      if (!this.isGachaCheatMode) {
                          // 不再直接增加，而是生成指令
                          const command = `_.add('归墟点[0]', ${dustReward}); // 重复获得补偿`;
                          this.pendingActions.push({ action: 'variable_update', command: command, text: `[获得] 归墟点 x ${dustReward}` });
                          this.savePendingActions();
                          this.showTemporaryMessage(`${res.名称} (重复)，补偿指令已入队`);
                      } else {
                          this.showTemporaryMessage(`${res.名称} (重复)`);
                      }
                  }
                                  const card = document.createElement('div');
                  
                  if (poolType === 'character') {
                      card.className = `gacha-results-card rarity-${res.稀有度.toUpperCase()}`;
                      if (res.图片) card.style.backgroundImage = `url('${res.图片}')`;
                      
                      const infoContainer = document.createElement('div');
                      infoContainer.className = 'gacha-results-card-info';
                      infoContainer.innerHTML = `<div class="item-name">${res.名称}</div><div class="item-rarity">${res.稀有度}</div>`;
                      if (isDuplicate) {
                          infoContainer.innerHTML += `<div class="gacha-results-duplicate-tag">重复</div>`;
                      }
                      card.appendChild(infoContainer);

                      if (!isDuplicate) {
                          const newTag = document.createElement('div');
                          newTag.className = 'gacha-results-new-tag';
                          newTag.textContent = 'NEW';
                          card.appendChild(newTag);
                      }
                  } else {
                      card.className = `gacha-results-card-text rarity-${res.稀有度.toUpperCase()}`;
                      let cardContentHtml = `<div class="item-name">${res.名称}</div>`;
                      cardContentHtml += `<div class="item-rarity">${res.稀有度}</div>`;
                      if (res.类型) {
                          cardContentHtml += `<div class="item-type">${res.类型}</div>`;
                      }
                      if (isDuplicate) {
                          cardContentHtml += `<div class="gacha-results-duplicate-tag" style="margin-top: 10px;">重复</div>`;
                      }
                      card.innerHTML = cardContentHtml;

                      if (!isDuplicate) {
                          const newTag = document.createElement('div');
                          newTag.className = 'gacha-results-new-tag';
                          newTag.textContent = 'NEW';
                          card.appendChild(newTag);
                      }
                  }
                  gridContainer.appendChild(card);
              });
              this.gachaHistory.unshift({ timestamp: new Date().toISOString(), results: results, poolType: poolType });
              if (this.gachaHistory.length > 200) this.gachaHistory.pop();
              this.saveGachaState();
          },

          showGachaHistory(page = 1) {
              this.openModal('gacha-history-modal', true);
              const listContainer = document.getElementById('gacha-history-list');
              const indicatorEl = document.getElementById('gacha-history-page-indicator');
              const prevBtn = document.getElementById('gacha-history-prev-btn');
              const nextBtn = document.getElementById('gacha-history-next-btn');

              if (!listContainer || !indicatorEl || !prevBtn || !nextBtn) {
                  console.error('衍梦尘历史记录界面UI元素缺失!');
                  return;
              }

              const itemsPerPage = 5;
              const totalPages = Math.ceil(this.gachaHistory.length / itemsPerPage);
              const currentPage = Math.max(1, Math.min(page, totalPages || 1));
              const pageItems = this.gachaHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

              // 核心修改：借鉴“诡秘”UI的简单循环逻辑，并增加安全检查
              let html = pageItems.length > 0 ? '' : '<p style=\"color:#a09c91; text-align:center; padding: 40px 0;\">暂无召唤记录</p>';
              pageItems.forEach(entry => {
                  // 安全检查 (1): 如果记录条目或其结果数组不存在，则跳过此条记录，避免程序崩溃
                  if (!entry || !entry.results) { 
                      console.warn('发现并跳过一条损坏的召唤历史记录:', entry);
                      return; 
                  }
                  const poolType = entry.poolType || 'character';
                  const poolNames = { character: '镜花水月', item: '万象奇珍', talent: '天命灵根' };
                  const poolName = poolNames[poolType] || '未知卡池';

                  const resultsHtml = entry.results.map(res => {
                      // 安全检查 (2): 如果结果数组中的某个物品不存在，也跳过它
                      if (!res) return '';
                      const rarity = res.稀有度 || 'R';
                      const name = res.名称 || '未知物品';
                      return `<div class=\"gacha-history-item-card rarity-${rarity.toUpperCase()}\" title=\"${name}\">${name}</div>`;
                  }).join('');

                  // 使用 += 拼接字符串，这是最简单且容错性高的循环渲染方式
                  html += `
                      <div class=\"gacha-history-entry\">
                          <div class=\"gacha-history-header\">
                              <span class=\"gacha-history-timestamp\">${new Date(entry.timestamp).toLocaleString('zh-CN')}</span>
                              <span class=\"gacha-history-pool\">${poolName}</span>
                          </div>
                          <div class=\"gacha-history-results-grid\">
                              ${resultsHtml}
                          </div>
                      </div>
                  `;
              });

              listContainer.className = 'gacha-history-list';
              listContainer.innerHTML = html;

              indicatorEl.textContent = `第 ${currentPage} / ${totalPages || 1} 页`;

              const newPrevBtn = prevBtn.cloneNode(true);
              prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
              const newNextBtn = nextBtn.cloneNode(true);
              nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
              
              newPrevBtn.disabled = currentPage <= 1;
              newNextBtn.disabled = currentPage >= totalPages;

              if (!newPrevBtn.disabled) newPrevBtn.onclick = () => this.showGachaHistory(currentPage - 1);
              if (!newNextBtn.disabled) newNextBtn.onclick = () => this.showGachaHistory(currentPage + 1);
          },

          
          showGachaItemDetails(itemData, poolType) {
              const titleEl = document.getElementById('gacha-details-title');
              const bodyEl = document.getElementById('gacha-details-body');
              const footerEl = document.getElementById('gacha-details-footer');
              if (!titleEl || !bodyEl || !footerEl) return;

              titleEl.textContent = itemData.名称;
              let imageHtml = poolType === 'character' ? `<div class="gacha-details-image-large" style="background-image: url('${itemData.图片 || ''}');"></div>` : '';
              let infoHtml = `<div class="gacha-details-info">
                  <p><strong>稀有度:</strong> ${itemData.稀有度 || '未知'}</p>
                  <p><strong>类型:</strong> ${itemData.类型 || itemData.系列 || '未知'}</p>
                  <p><strong>描述:</strong> ${itemData.描述 || '暂无详细描述'}</p>
              </div>`;
              bodyEl.innerHTML = imageHtml + infoHtml;

              const companions = this.gachaState.activeCompanions || [];
              const isAlreadyActive = companions.some(c => c.id === itemData.id);
              const isAlreadyQueued = this.pendingActions.some(action => action.action === 'join_world' && action.itemName === itemData.名称);

              let joinButtonHtml = '';
              if (isAlreadyActive) {
                  joinButtonHtml = `<button class="interaction-btn primary-btn" disabled>已在世界中</button>`;
              } else if (isAlreadyQueued) {
                  joinButtonHtml = `<button class="interaction-btn primary-btn" disabled>已在指令队列</button>`;
              } else {
                  let isDisabled = false;
                  let disabledReason = '';
                  if (poolType === 'character') {
                      const totalLimitReached = companions.length >= 3;
                      const ssrLimitReached = companions.filter(c => c.rarity === 'SSR').length >= 1;
                      const isCharSSR = itemData.稀有度 === 'SSR';

                      if (totalLimitReached) { isDisabled = true; disabledReason = `伙伴已满 (${companions.length}/3)`; }
                      else if (isCharSSR && ssrLimitReached) { isDisabled = true; disabledReason = `SSR伙伴已满 (1/1)`; }
                  }
                  
                  if (isDisabled) {
                      joinButtonHtml = `<button class="interaction-btn primary-btn" disabled>${disabledReason}</button>`;
                  } else {
                      joinButtonHtml = `<button id="btn-gacha-join-world" class="interaction-btn primary-btn">加入当前世界</button>`;
                  }
              }

              footerEl.innerHTML = `
                  <button onclick="GuixuManager.closeModal('gacha-details-modal')" class="interaction-btn">关闭</button>
                  ${joinButtonHtml}
              `;

              const joinButton = document.getElementById('btn-gacha-join-world');
              if (joinButton) {
                  joinButton.onclick = () => this.handleJoinWorld(itemData, poolType);
              }

              this.openModal('gacha-details-modal', true);
          },

          _parseLorebookCharacter(contentBlock, poolType) {
              const item = {};
              const lines = contentBlock.split('\n');
              lines.forEach(line => {
                  const parts = line.split(':');
                  if (parts.length < 2) return;
                  const key = parts[0].trim();
                  const value = parts.slice(1).join(':').trim();
                  switch (key) {
                      case '名称': item.名称 = value; break;
                      case '系列': item.系列 = value; break;
                      case '图片': item.图片 = value; break;
                      case '稀有度': item.稀有度 = value.toUpperCase(); break;
                      case '类型': item.类型 = value; break;
                      case '描述': item.描述 = value; break;
                  }
              });
              if (item.名称 && item.稀有度) return item;
              return null;
          },

          async loadCharacterPoolFromLorebook() {
              this.showTemporaryMessage('正在从世界书同步衍梦尘卡池...', 1500);
              const bookName = '【归墟扩展】衍梦尘卡池';
              const newPools = { character: { ssr: [], sr: [], r: [] }, item: { ssr: [], sr: [], r: [] }, talent: { ssr: [], sr: [], r: [] } };
              try {
                  const entries = await TavernHelper.getLorebookEntries(bookName);
                  if (!entries || entries.length === 0) { this.showTemporaryMessage(`警告：未找到或“${bookName}”世界书为空。`, 3000); return; }
                  let count = 0;
                  const poolMapping = { '[角色池]': 'character', '[道具池]': 'item', '[天赋池]': 'talent' };
                  for (const entry of entries) {
                      const poolType = poolMapping[entry.comment];
                      if (poolType && entry.enabled === false) {
                          const itemBlocks = entry.content.split(/\n*\s*名称:/).filter(block => block.trim() !== '');
                          for (const block of itemBlocks) {
                              const fullBlock = '名称:' + block;
                              const item = this._parseGachaPoolEntry(fullBlock);
                              if (item) {
                                  item.id = `${poolType}_${item.名称}`.replace(/\s/g, '_');
                                  const rarityKey = item.稀有度.toLowerCase();
                                  if (newPools[poolType][rarityKey]) {
                                      newPools[poolType][rarityKey].push(item);
                                      count++;
                                  }
                              }
                          }
                      }
                  }
                  this.gachaPools = newPools;
                  console.log(`[衍梦尘] 成功从世界书加载 ${count} 个项目。`);
                  if (count === 0) this.showTemporaryMessage('未在禁用的条目中找到任何格式正确的卡池项目。', 4000);
              } catch (e) {
                  console.error('加载衍梦尘卡池失败:', e);
                  this.showTemporaryMessage('错误：加载卡池失败，请检查世界书。', 3000);
              }
          },

          _parseGachaPoolEntry(blockText) {
              const item = {};
              const lines = blockText.trim().split('\n');
              let worldbookContent = '';
              let isDetailSection = false;

              for (const line of lines) {
                  if (line.trim() === '<详细信息>') {
                      isDetailSection = true;
                      continue;
                  }
                  if (line.trim() === '</详细信息>') {
                      isDetailSection = false;
                      continue;
                  }

                  if (isDetailSection) {
                      worldbookContent += line + '\n';
                  } else {
                      const match = line.match(/^([^:]+):\s*(.*)$/);
                      if (match) {
                          const key = match[1].trim();
                          const value = match[2].trim();
                          item[key] = value;
                      }
                  }
              }

              item.worldbookContent = worldbookContent.trim();

              if (item.名称 && item.稀有度 && item.类型 && item.描述) {
                  return item;
              }
              return null;
          },

          async handleRedeemCode(code, onSuccessCallback) {
              if (!code || !code.trim()) {
                  this.showTemporaryMessage('请输入兑换码。');
                  return;
              }
              const upperCaseCode = code.trim().toUpperCase();
              
              const manualCodeDB = {
                  'GUIXU666': { reward: 1600, type: 'mengChen' },
                  'MENGXING888': { reward: 3200, type: 'mengChen' }
              };
              const manualEntry = manualCodeDB[upperCaseCode];
              
              if (manualEntry) {
                  if (this.gachaState.redeemedCodes.includes(upperCaseCode)) {
                      this.showTemporaryMessage('您已经兑换过这个礼包了。');
                      if (onSuccessCallback) onSuccessCallback();
                      return;
                  }
                  // 直接执行MVU指令，立即增加归墟点
                  const command = `_.add('归墟点[0]', ${manualEntry.reward}); // 兑换码奖励`;
                  await this.executeMvuCommandDirect(command);

                  this.gachaState.redeemedCodes.push(upperCaseCode);
                  this.saveGachaState(); // 只保存兑换码使用记录
                  this.showTemporaryMessage(`兑换成功！获得 ${manualEntry.reward} 归墟点！`, 3000);
                  if (onSuccessCallback) onSuccessCallback();
                  return;
              }
               this.showTemporaryMessage('无效的兑换码。');
          },
     

          saveGachaCheatState() {
              AppStorage.saveData('gacha_cheat_mode', this.isGachaCheatMode);
          },

          loadGachaCheatState() {
              this.isGachaCheatMode = AppStorage.loadData('gacha_cheat_mode', false);
          },

          _loadGachaDataFromSave(saveData) {
              if (saveData && saveData.gacha_data) {
                  this.gachaState = saveData.gacha_data.state;
                  this.gachaCollection = saveData.gacha_data.collection;
                  this.gachaHistory = saveData.gacha_data.history;
                  console.log('[衍梦尘] 已成功从存档文件加载Gacha数据。');
              } else {
                  // 如果是旧存档或新游戏，则重置为初始状态
                  this.gachaState = { mengChen: 1600, pitySSR_char: 0, pitySR_char: 0, pitySSR_item: 0, pitySR_item: 0, pitySSR_talent: 0, pitySR_talent: 0, redeemedCodes: [] };
                  this.gachaCollection = {};
                  this.gachaHistory = [];
                  console.log('[衍梦尘] 未在存档中找到Gacha数据，已重置为初始状态。');
              }
              // 将从存档加载的状态，立刻保存为当前的实时状态，以便刷新后能正确保留
              this.saveGachaState();
          },
     
          // “加入世界”核心逻辑重构 (v4 - 创建/覆盖世界书)
          async handleJoinWorld(itemData, poolType) {
              // 检查是否已有激活或待处理
              const isAlreadyQueued = this.pendingActions.some(action => action.itemName === itemData.名称);
              if (isAlreadyQueued) {
                  this.showTemporaryMessage(`[${itemData.名称}] 已在指令队列中。`, 'info');
                  return;
              }
              const isAlreadyActive = poolType === 'character' ?
                  this.gachaState.activeCompanions.some(c => c.id === itemData.id) :
                  this.gachaState.activatedItems.includes(itemData.id);
              if (isAlreadyActive) {
                  this.showTemporaryMessage(`[${itemData.名称}] 已加入或已激活。`, 'info');
                  return;
              }

              // 核心逻辑：创建或覆盖世界书
              if (!itemData.worldbookContent || itemData.worldbookContent.trim() === '') {
                  this.showTemporaryMessage(`“${itemData.名称}”没有详细信息，无法写入世界书。`, 'warning');
              } else {
                  this.showTemporaryMessage(`正在为“${itemData.名称}”写入世界书...`, 'info');
                  try {
                      const bookName = '1归墟';
                      const allEntries = await TavernHelper.getLorebookEntries(bookName);
                      const existingEntry = allEntries.find(entry => entry.comment === itemData.名称);

                      if (existingEntry) {
                          await TavernHelper.setLorebookEntries(bookName, [{
                              uid: existingEntry.uid,
                              content: itemData.worldbookContent,
                              enabled: true
                          }]);
                          this.showTemporaryMessage(`已成功覆盖“${itemData.名称}”的世界书条目！`, 'success');
                      } else {
                          await TavernHelper.createLorebookEntries(bookName, [{
                              comment: itemData.名称,
                              content: itemData.worldbookContent,
                              enabled: true
                          }]);
                          this.showTemporaryMessage(`已为“${itemData.名称}”创建新的世界书条目！`, 'success');
                      }
                  } catch (e) {
                      console.error('写入世界书条目失败:', e);
                      this.showTemporaryMessage('写入世界书条目失败', 'error');
                      return; // 写入失败则中止
                  }
              }

              // 更新UI和状态
              if (poolType === 'character') {
                  this.gachaState.activeCompanions.push({ id: itemData.id, name: itemData.名称, rarity: itemData.稀有度 });
              } else {
                  this.gachaState.activatedItems.push(itemData.id);
              }
              this.saveGachaState();

              // 添加到待处理指令队列
              const simpleAction = {
                  action: 'acquire_item_talent',
                  itemName: itemData.名称,
                  itemData: { 类型: itemData.类型 || '角色', 描述: itemData.描述 || '无简介' }
              };
              this.pendingActions.push(simpleAction);
              this.savePendingActions();

              // 关闭和刷新UI
              if (document.getElementById('gacha-gallery-popup').style.display === 'flex') {
                  this.showGachaGalleryPopup(poolType);
              }
              this.closeModal('gacha-details-modal');
          }, };

       // 将GuixuManager暴露到全局作用域，以便onclick事件可以访问
       if (window.GuixuManager && typeof window.GuixuManager.destroy === 'function') {
         window.GuixuManager.destroy();
       }
       window.GuixuManager = GuixuManager;
 
         // --- Entry Point ---
          // 类脑/旅程梦星作品，禁止二传，禁止商业化，均无偿免费开源分享
          eventOn(tavern_events.APP_READY, () => {
            GuixuManager.init();
            
            // 过滤无关的控制台错误，避免干扰调试
            const originalConsoleError = console.error;
            console.error = function(...args) {
              const message = args.join(' ');
              // 过滤掉与归墟Plus无关的资源加载错误
              if (message.includes('ui-icons') ||
                  message.includes('MIME type') ||
                  message.includes('stylesheet MIME type') ||
                  message.includes('404 (Not Found)')) {
                return; // 静默处理这些错误
              }
              // 其他错误正常输出
              originalConsoleError.apply(console, args);
            };
          });
  
          // 事件监听已在 GuixuManager.init() 中处理，此处不再需要
      })();
