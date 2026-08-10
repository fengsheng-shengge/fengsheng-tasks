/**
 * FSRadar — Pure SVG Radar Chart Component
 * ==========================================
 * 零依赖，纯原生 JavaScript，使用 SVG 绘制雷达图/蛛网图。
 *
 * 用法:
 *   FSRadar.draw('container-id', {
 *     labels: ['A', 'B', 'C', 'D', 'E'],
 *     values: [7, 8, 5, 7, 6],
 *     maxValue: 9,
 *     size: 320,
 *     color: '#3d5a3e',
 *     colorLight: 'rgba(61,90,62,0.15)',
 *     gridColor: '#d9c9b8',
 *     labelColor: '#555555',
 *     showScores: true,
 *     showLegend: true
 *   });
 */
(function () {
  'use strict';

  // SVG 命名空间常量
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // =========================================================================
  // 工具函数
  // =========================================================================

  /**
   * 创建带属性的 SVG 元素
   * @param {string} tag   - SVG 标签名 (如 'circle', 'line', 'text')
   * @param {object} attrs - 属性键值对
   * @returns {SVGElement}
   */
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        el.setAttribute(key, attrs[key]);
      }
    }
    return el;
  }

  /**
   * 极坐标转笛卡尔坐标
   * @param {number} cx    - 圆心 X
   * @param {number} cy    - 圆心 Y
   * @param {number} r     - 半径
   * @param {number} angle - 弧度 (0 = 右侧, 逆时针为正)
   * @returns {{x: number, y: number}}
   */
  function polarToCartesian(cx, cy, r, angle) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  /**
   * 根据角度判断文字锚点：右侧 → start，左侧 → end，其他 → middle
   */
  function anchorForAngle(angle) {
    var cos = Math.cos(angle);
    if (cos > 0.15) return 'start';
    if (cos < -0.15) return 'end';
    return 'middle';
  }

  // =========================================================================
  // 主入口
  // =========================================================================

  window.FSRadar = {
    /**
     * 在指定容器中绘制雷达图
     *
     * @param {string} containerId - 容器元素的 id
     * @param {object} config      - 配置对象，详见顶部注释
     */
    draw: function (containerId, config) {
      // ----- 合并默认配置 -----
      var cfg = Object.assign({
        labels: [],
        values: [],
        maxValue: 9,
        size: 320,
        color: '#3d5a3e',
        colorLight: 'rgba(61,90,62,0.15)',
        gridColor: '#d9c9b8',
        labelColor: '#555555',
        showScores: true,
        showLegend: true
      }, config);

      // ----- 查找容器 -----
      var container = document.getElementById(containerId);
      if (!container) {
        console.error('FSRadar: 找不到容器元素 #' + containerId);
        return;
      }

      var n = cfg.labels.length;
      if (n < 3) {
        console.error('FSRadar: 至少需要 3 个标签，当前只有 ' + n + ' 个');
        return;
      }

      // ----- 几何参数 -----
      var cx = cfg.size / 2;
      var cy = cfg.size / 2;
      var padding = 44;                // 为标签文字预留的空间
      var radius = cx - padding;       // 雷达图实际半径

      // 三个同心网格层级 (30%, 60%, 100%)
      var gridLevels = [0.3, 0.6, 1.0];

      // 每条轴的角度：从正上方 (-π/2) 开始，顺时针排列
      var angles = [];
      for (var i = 0; i < n; i++) {
        angles.push(-Math.PI / 2 + (2 * Math.PI * i) / n);
      }

      // ----- 创建 SVG 根元素 -----
      var svg = svgEl('svg', {
        width: cfg.size,
        height: cfg.size,
        viewBox: '0 0 ' + cfg.size + ' ' + cfg.size
      });

      // =====================================================================
      // 1. 绘制三层同心网格多边形
      // =====================================================================
      for (var g = 0; g < gridLevels.length; g++) {
        var level = gridLevels[g];
        var gridPts = [];
        for (var j = 0; j < n; j++) {
          var gp = polarToCartesian(cx, cy, radius * level, angles[j]);
          gridPts.push(gp.x + ',' + gp.y);
        }
        svg.appendChild(svgEl('polygon', {
          points: gridPts.join(' '),
          fill: 'none',
          stroke: cfg.gridColor,
          'stroke-width': '1'
        }));
      }

      // =====================================================================
      // 2. 绘制从中心到顶点的轴线
      // =====================================================================
      for (var k = 0; k < n; k++) {
        var axisEnd = polarToCartesian(cx, cy, radius, angles[k]);
        svg.appendChild(svgEl('line', {
          x1: cx,
          y1: cy,
          x2: axisEnd.x,
          y2: axisEnd.y,
          stroke: cfg.gridColor,
          'stroke-width': '1'
        }));
      }

      // =====================================================================
      // 3. 绘制数据多边形（填充色）和数据点（小圆点）
      // =====================================================================
      if (cfg.values.length === n) {
        // 计算每个数据点的笛卡尔坐标（值被 clamp 到 [0, maxValue]）
        var dataPts = [];
        for (var d = 0; d < n; d++) {
          var val = Math.min(Math.max(cfg.values[d], 0), cfg.maxValue);
          var r = (val / cfg.maxValue) * radius;
          dataPts.push(polarToCartesian(cx, cy, r, angles[d]));
        }

        // 数据多边形
        var dataStr = dataPts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
        svg.appendChild(svgEl('polygon', {
          points: dataStr,
          fill: cfg.colorLight,
          stroke: cfg.color,
          'stroke-width': '2',
          'stroke-linejoin': 'round'
        }));

        // 数据点圆圈（带白色描边，更醒目）
        for (var p = 0; p < dataPts.length; p++) {
          svg.appendChild(svgEl('circle', {
            cx: dataPts[p].x,
            cy: dataPts[p].y,
            r: '4',
            fill: cfg.color,
            stroke: '#ffffff',
            'stroke-width': '1.5'
          }));
        }
      }

      // =====================================================================
      // 4. 绘制各顶点标签
      // =====================================================================
      for (var l = 0; l < n; l++) {
        var labelAngle = angles[l];
        var labelR = radius + 22; // 标签放在顶点外侧 22px
        var labelPt = polarToCartesian(cx, cy, labelR, labelAngle);
        var anchor = anchorForAngle(labelAngle);

        var text = svgEl('text', {
          x: labelPt.x,
          y: labelPt.y,
          fill: cfg.labelColor,
          'font-size': '13',
          'font-family': 'sans-serif',
          'text-anchor': anchor,
          'dominant-baseline': 'central'
        });
        text.textContent = cfg.labels[l];
        svg.appendChild(text);
      }

      // =====================================================================
      // 5. 在轴线上显示分数（可选）
      //    分数放在数据点内侧，沿轴线方向偏移，避免与标签重叠
      // =====================================================================
      if (cfg.showScores && cfg.values.length === n) {
        for (var s = 0; s < n; s++) {
          var scoreVal = cfg.values[s];
          var scoreR = (Math.min(Math.max(scoreVal, 0), cfg.maxValue) / cfg.maxValue) * radius;
          // 分数放在数据点内侧 14px 处，最小距离中心 12px
          var scoreOffset = Math.max(scoreR - 14, 12);
          var scorePt = polarToCartesian(cx, cy, scoreOffset, angles[s]);

          var scoreText = svgEl('text', {
            x: scorePt.x,
            y: scorePt.y,
            fill: cfg.color,
            'font-size': '12',
            'font-family': 'sans-serif',
            'font-weight': 'bold',
            'text-anchor': 'middle',
            'dominant-baseline': 'central'
          });
          scoreText.textContent = scoreVal;
          svg.appendChild(scoreText);
        }
      }

      // ----- 清空容器并挂载 SVG -----
      container.innerHTML = '';
      container.appendChild(svg);

      // =====================================================================
      // 6. 绘制图例（可选）
      // =====================================================================
      if (cfg.showLegend) {
        var legend = document.createElement('div');
        legend.style.cssText = [
          'text-align:center',
          'margin-top:10px',
          'font-size:12px',
          'font-family:sans-serif',
          'color:' + cfg.labelColor
        ].join(';');

        // 色块
        var swatch = document.createElement('span');
        swatch.style.cssText = [
          'display:inline-block',
          'width:12px',
          'height:12px',
          'background:' + cfg.colorLight,
          'border:1px solid ' + cfg.color,
          'margin-right:6px',
          'vertical-align:middle'
        ].join(';');

        legend.appendChild(swatch);
        legend.appendChild(document.createTextNode('\u7efc\u5408\u8bc4\u5206')); // 综合评分
        container.appendChild(legend);
      }
    }
  };

})();