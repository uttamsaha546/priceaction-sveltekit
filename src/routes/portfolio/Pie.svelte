<!-- Pie.svelte -->
<script>
  let { 
    size = 200, 
    sections = [
      { value: 10, percent: 10, color: '#ff6b6b', text: 'Apples' },
      { value: 20, percent: 20, color: '#4dadf7', text: 'Bananas' },
      { value: 30, percent: 30, color: '#33d9b2', text: 'Cherries' },
      { value: 40, percent: 40, color: '#ffb142', text: 'Dates' }
    ],
    bgColor = '#f1f3f5'
  } = $props();
  
  let viewBox = $derived(`0 0 ${size} ${size}`);
  let center = $derived(size / 2);
  let radius = $derived(size / 4); 
  let circumference = $derived(2 * Math.PI * radius);

  // Distance from the center of the pie chart where the text should sit
  // radius * 2 is the total visual radius, so multiplying by 1.2 puts it nicely in the middle of the slice
  let labelRadius = $derived(radius * 1.2);

  let preparedSections = $derived.by(() => {
    let currentSum = 0;
    
    return sections.map(section => {
      const arcLength = (section.percent / 100) * circumference;
      const dashArray = `${arcLength} ${circumference}`;
      
      const startRotation = (currentSum / 100) * 360;
      const sliceAngle = (section.percent / 100) * 360;
      
      // Find the absolute middle angle of this specific slice
      // Subtracting 90 aligns it with the SVG rotation starting at 12 o'clock
      const middleAngleDegrees = startRotation + (sliceAngle / 2) - 90;
      const middleAngleRadians = (middleAngleDegrees * Math.PI) / 180;
      
      // Trigonometry to find the exact X and Y coordinates for the text
      const textX = center + labelRadius * Math.cos(middleAngleRadians);
      const textY = center + labelRadius * Math.sin(middleAngleRadians);

      currentSum += section.percent;

      return {
        ...section,
        dashArray,
        rotation: startRotation,
        textX,
        textY
      };
    });
  });
</script>

<svg width={size} height={size} {viewBox}>
  <!-- Base background circle -->
  <circle r={radius * 2} cx={center} cy={center} fill={bgColor} />
  
  <!-- Render each section path -->
  {#each preparedSections as section}
    <circle
      r={radius}
      cx={center}
      cy={center}
      fill="none"
      stroke={section.color}
      stroke-width={radius * 2}
      stroke-dasharray={section.dashArray}
      transform="rotate({section.rotation - 90} {center} {center})"
    />
  {/each}

  <!-- Render text elements over the paths so they stay readable -->
  {#each preparedSections as section}
    <text
      x={section.textX}
      y={section.textY}
      text-anchor="middle"
      dominant-baseline="central"
      fill="#ffffff"
      font-size="{size * 0.05}px"
      font-weight="bold"
      style="font-family: sans-serif; pointer-events: none;"
    >
      <tspan x={section.textX} dy="-0.6em">{section.text}</tspan>
      <tspan x={section.textX} dy="1.2em">{section.value.toLocaleString('en-IN')} ({section.percent.toFixed(2)}%)</tspan>
    </text>
  {/each}
</svg>