/**
 * 风声运营监测报告 · ECharts 图表
 * Charts: Response Time Distribution & Domain Distribution
 */
(function() {
  'use strict';

  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var green = style.getPropertyValue('--green').trim();
  var yellow = style.getPropertyValue('--yellow').trim();
  var red = style.getPropertyValue('--red').trim();

  // ── Chart 1: Response Time Distribution ──
  var rtChart = echarts.init(document.getElementById('chart-response-time'));

  var endpoints = [
    '/', '/dictionary/', '/scene/', '/knowledge/', '/about/',
    '/mentor/', '/search/', '/history/', '/entry/', '/assessment/',
    '/breeder/', '/care-test/', '/quality-test/', '/decoder/', '/partner/',
    '/ip-design/', '/standard/', '/terms/', '/skills/', '/shuowenjiedao/', '/dashboard/'
  ];
  var times = [1.02, 0.64, 0.69, 0.73, 0.67, 0.79, 0.58, 0.75, 1.05, 0.81, 0.78, 0.81, 0.68, 0.65, 0.66, 0.78, 0.67, 0.75, 0.75, 0.76, 0.85];

  var rtOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        var p = params[0];
        return '<strong>' + p.name + '</strong><br/>响应时间: <strong>' + p.value + 's</strong>';
      }
    },
    grid: {
      left: 20,
      right: 20,
      bottom: 60,
      top: 10,
      containLabel: false
    },
    xAxis: {
      type: 'category',
      data: endpoints,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
        color: muted,
        interval: 0
      },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '秒',
      nameTextStyle: { color: muted, fontSize: 11 },
      axisLabel: { color: muted, fontSize: 10, formatter: '{value}s' },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } },
      min: 0.4,
      max: 1.2
    },
    series: [{
      type: 'bar',
      data: times.map(function(v) {
        var color;
        if (v < 0.7) color = green;
        else if (v < 0.9) color = yellow;
        else color = red;
        return {
          value: v,
          itemStyle: {
            color: color,
            borderRadius: [3, 3, 0, 0]
          }
        };
      }),
      barWidth: 14,
      label: {
        show: true,
        position: 'top',
        fontSize: 10,
        color: muted,
        formatter: function(p) { return p.value + 's'; }
      }
    }]
  };

  rtChart.setOption(rtOption);
  window.addEventListener('resize', function() { rtChart.resize(); });

  // ── Chart 2: Domain Distribution ──
  var ddChart = echarts.init(document.getElementById('chart-domain-dist'));

  var domains = [
    '签约前', '签约后', '资产持有与运营', '居住中', '职业成长',
    '签约中', '业主', 'SNG', 'trade', '退租出售', 'CAR', 'OWN', '跨域通用'
  ];
  var counts = [829, 688, 631, 463, 431, 389, 340, 274, 265, 250, 243, 174, 90];

  var ddOption = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return '<strong>' + params.name + '</strong><br/>' +
               '词条数: <strong>' + params.value + '</strong><br/>' +
               '占比: <strong>' + params.percent + '%</strong>';
      }
    },
    series: [{
      type: 'pie',
      radius: ['35%', '65%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      padAngle: 1,
      itemStyle: {
        borderRadius: 4,
        borderColor: style.getPropertyValue('--bg').trim(),
        borderWidth: 2
      },
      label: {
        show: true,
        fontSize: 11,
        color: ink,
        formatter: function(p) { return p.name + '\n' + p.value; }
      },
      labelLine: {
        lineStyle: { color: rule }
      },
      emphasis: {
        label: { fontSize: 14, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' }
      },
      data: counts.map(function(v, i) {
        var colors = [
          '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
          '#0891b2', '#db2777', '#65a30d', '#0d9488', '#9333ea',
          '#ea580c', '#0284c7', '#4f46e5'
        ];
        return {
          value: v,
          name: domains[i],
          itemStyle: { color: colors[i % colors.length] }
        };
      })
    }]
  };

  ddChart.setOption(ddOption);
  window.addEventListener('resize', function() { ddChart.resize(); });

})();