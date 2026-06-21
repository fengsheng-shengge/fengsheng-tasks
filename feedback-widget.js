/* feedback-widget.js v1.0 | 风声互动反馈组件
 * 用法：<script src="/feedback-widget.js" data-module="quality-test"></script>
 * 事件类型：sentiment（👍/👎）、rating（1-5星）、feedback（文本）
 * 数据推送：POST /api/event
 */

(function() {
  'use strict';

  var script = document.currentScript || document.querySelector('script[src*="feedback-widget"]');
  var moduleName = (script && script.dataset.module) || window.location.pathname.replace(/^\//, '').replace(/\//g, '-') || 'home';
  var pageUrl = window.location.pathname;

  // 延迟初始化，避免阻塞首屏渲染
  setTimeout(init, 800);

  function init() {
    // 检查是否已有反馈组件
    if (document.getElementById('fs-feedback-widget')) return;

    var container = document.createElement('div');
    container.id = 'fs-feedback-widget';
    container.className = 'fs-feedback-widget';
    container.innerHTML = getHTML();

    // 插入到页面底部
    var footer = document.querySelector('.page-footer, .footer, footer');
    if (footer) {
      footer.parentNode.insertBefore(container, footer.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    bindEvents();
  }

  function getHTML() {
    return '<div class="fs-fb-widget">'
      + '<div class="fs-fb-header">这篇文章对你有帮助吗？</div>'
      + '<div class="fs-fb-actions">'
      + '  <button class="fs-fb-btn fs-fb-yes" data-action="sentiment" data-value="1">👍 有帮助</button>'
      + '  <button class="fs-fb-btn fs-fb-no" data-action="sentiment" data-value="-1">👎 没帮助</button>'
      + '</div>'
      + '<div class="fs-fb-stars-wrap" style="display:none">'
      + '  <div class="fs-fb-stars-header">给个评分吧</div>'
      + '  <div class="fs-fb-stars" id="fs-fb-stars">'
      + '    <span class="fs-star" data-score="1">☆</span>'
      + '    <span class="fs-star" data-score="2">☆</span>'
      + '    <span class="fs-star" data-score="3">☆</span>'
      + '    <span class="fs-star" data-score="4">☆</span>'
      + '    <span class="fs-star" data-score="5">☆</span>'
      + '  </div>'
      + '  <span class="fs-fb-score-label"></span>'
      + '</div>'
      + '<div class="fs-fb-textarea-wrap" style="display:none">'
      + '  <textarea class="fs-fb-textarea" placeholder="告诉我们更多...（选填）" rows="2"></textarea>'
      + '  <button class="fs-fb-submit">提交反馈</button>'
      + '</div>'
      + '<div class="fs-fb-result"></div>'
      + '</div>'
      + '<style>'
      + '.fs-feedback-widget{max-width:480px;margin:24px auto;padding:16px;background:#f7f4ef;border:1px solid rgba(80,90,70,.09);border-radius:12px;text-align:center}'
      + '.fs-fb-header{font-size:14px;color:#555;margin-bottom:12px}'
      + '.fs-fb-actions{display:flex;gap:10px;justify-content:center}'
      + '.fs-fb-btn{padding:8px 20px;border-radius:8px;border:1px solid rgba(80,90,70,.15);background:#fff;cursor:pointer;font-size:14px;transition:all .15s}'
      + '.fs-fb-btn:hover{background:#3d5a3e;color:#fff;border-color:#3d5a3e}'
      + '.fs-fb-btn.active{background:#3d5a3e;color:#fff;border-color:#3d5a3e}'
      + '.fs-fb-stars-wrap{margin-top:12px}'
      + '.fs-fb-stars-header{font-size:13px;color:#555;margin-bottom:6px}'
      + '.fs-fb-stars{font-size:28px;cursor:pointer;display:flex;justify-content:center;gap:4px}'
      + '.fs-star{color:#ddd;transition:color .15s}'
      + '.fs-star.active{color:#c46a3a}'
      + '.fs-fb-score-label{font-size:12px;color:#888;margin-top:4px;display:block}'
      + '.fs-fb-textarea-wrap{margin-top:12px;display:flex;flex-direction:column;gap:8px}'
      + '.fs-fb-textarea{width:100%;padding:10px;border:1px solid rgba(80,90,70,.15);border-radius:8px;resize:vertical;font-size:13px;font-family:inherit;background:#fff}'
      + '.fs-fb-submit{padding:8px 0;border:none;border-radius:8px;background:#3d5a3e;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s}'
      + '.fs-fb-submit:hover{background:#2c4430}'
      + '.fs-fb-submit:disabled{background:#b5a89a;cursor:not-allowed}'
      + '.fs-fb-result{margin-top:10px;font-size:13px;min-height:20px}'
      + '.fs-fb-result.success{color:#3d5a3e}'
      + '.fs-fb-result.error{color:#c0392b}'
      + '@media(max-width:640px){.fs-feedback-widget{margin:20px 12px;padding:14px 10px}}'
      + '</style>';
  }

  function bindEvents() {
    var widget = document.getElementById('fs-feedback-widget');
    if (!widget) return;

    var stars = widget.querySelectorAll('.fs-star');
    var scoreLabel = widget.querySelector('.fs-fb-score-label');
    var currentScore = 0;
    var labels = ['', '☆ 1分 · 不可用', '☆ 2分 · 需改进', '☆ 3分 · 一般', '☆ 4分 · 好用', '★ 5分 · 超预期'];

    // 👍/👎 按钮
    widget.querySelectorAll('.fs-fb-btn[data-action="sentiment"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var value = this.dataset.value;
        // 高亮当前按钮
        this.parentElement.querySelectorAll('.fs-fb-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');

        // 展示评分星星
        var starsWrap = widget.querySelector('.fs-fb-stars-wrap');
        if (starsWrap) starsWrap.style.display = 'block';

        sendEvent({ type: 'sentiment', value: parseInt(value), page: pageUrl });

        showResult(widget, '感谢反馈！');
      });
    });

    // 星星评分
    stars.forEach(function(star) {
      star.addEventListener('mouseenter', function() {
        var i = parseInt(this.dataset.score);
        highlightStars(stars, i);
        scoreLabel.textContent = labels[i];
      });
      star.addEventListener('mouseleave', function() {
        highlightStars(stars, currentScore);
        scoreLabel.textContent = currentScore > 0 ? labels[currentScore] : '';
      });
      star.addEventListener('click', function() {
        currentScore = parseInt(this.dataset.score);
        highlightStars(stars, currentScore);
        scoreLabel.textContent = labels[currentScore];

        // 展示文本输入
        var textareaWrap = widget.querySelector('.fs-fb-textarea-wrap');
        if (textareaWrap) textareaWrap.style.display = 'flex';

        sendEvent({ type: 'rating', value: currentScore, page: pageUrl });
      });
    });

    // 提交文本反馈
    var submitBtn = widget.querySelector('.fs-fb-submit');
    var textarea = widget.querySelector('.fs-fb-textarea');
    if (submitBtn && textarea) {
      submitBtn.addEventListener('click', function() {
        var text = textarea.value.trim();
        if (text) {
          sendEvent({ type: 'feedback', value: currentScore, text: text, page: pageUrl });
          showResult(widget, '✓ 反馈已收到，谢谢你的贡献！');
          textarea.value = '';
          submitBtn.disabled = true;
        }
      });
    }
  }

  function highlightStars(stars, n) {
    stars.forEach(function(star) {
      var j = parseInt(star.dataset.score);
      star.textContent = j <= n ? '★' : '☆';
      star.classList.toggle('active', j <= n);
    });
  }

  function showResult(widget, msg) {
    var result = widget.querySelector('.fs-fb-result');
    if (result) {
      result.textContent = msg;
      result.className = 'fs-fb-result success';
      setTimeout(function() { result.textContent = ''; }, 3000);
    }
  }

  function sendEvent(data) {
    try {
      var payload = {
        module: moduleName,
        type: data.type,
        value: data.value,
        text: data.text || '',
        page: data.page || pageUrl,
        source: 'feedback-widget',
        t: Date.now()
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/event', JSON.stringify(payload));
      } else {
        fetch('/api/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function() {});
      }
    } catch(e) {
      // 静默失败，不影响用户体验
    }
  }
})();