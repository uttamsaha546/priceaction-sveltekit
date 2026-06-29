<script>
const sectors = [
  {
    name: "Capital Goods",
    industries: [
      { name: "Defence" },
      { name: "..." }
    ]
  },
  {
    name: "Financial Services",
    industries: [
      {
        name: "Banks",
        subIndustries: ["Private Bank", "PSU Bank"]
      },
      {
        name: "Finance",
        subIndustries: ["NBFC", "Housing Finance"]
      },
      { name: "Insurance" },
      { name: "Capital Market" }
    ]
  },
  {
    name: "Healthcare",
    industries: [
      { name: "Pharma" },
      { name: "Hospitals" }
    ]
  },
  {
    name: 'Chemicals'
  },
  {
    name: 'Automobile & Auto Components'
  },
  {
    name: 'FMCG',
    industries: [{name: 'Sugar & Ethanol'}],
  },
  {name: 'Consumer Durables'},
  {name: 'IT'},
  {
    name: 'Consumer Services',
    industries: [
    {name: 'Retailing'}, 
    {name: 'Leisure Service (Tourism 63%)'}
    ]
  },
  {name: 'Services'},
  {name: 'Construction'},
  {name: 'Oil & Gas'},
  {name: 'Metal'},
  {name: 'Realty'},
  {name: 'Power'},
  {name: 'Cement'},
  {name: 'Telecom'},
  {name: 'Media/Waves'},
  {name: 'Utilities'},
];
</script>

<h1>IndexAnalysisComponent</h1>


<table>
  <thead>
    <tr>
      <th>S</th>
      <th>I</th>
      <th>Sub-Ind</th>
    </tr>
  </thead>
  <tbody>
    {#each sectors as sector}
      <tr>
        <td colspan="3" class="sector-row"><div>{sector.name}</div></td>
      </tr>

    {#if sector.industries}
      {#each sector.industries as industry}
        <tr>
          <td></td> <td colspan="2" class="industry-row">{industry.name}</td>
        </tr>

        {#if industry.subIndustries}
          {#each industry.subIndustries as sub}
            <tr>
              <td></td> <td></td> <td class="sub-row">{sub}</td>
            </tr>
          {/each}
        {/if}
      {/each}
      {/if}
    {/each}
  </tbody>
</table>


<style>
/* Base table styling */
table {
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  margin: 10px 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Header styling */
th {
  background-color: #333;
  color: white;
  padding: 2px 4px;
  text-align: left;
  font-weight: 600;
}

/* Cell styling */
td {
  padding: 2px 4px;
  text-align: left;
 // border: 1px solid #ddd;
}

td > div{
overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowarp;
  max-width: 200px;
}

/* Styling the active spanned cells to stand out */
td[colspan] {
  font-weight: bold;
}

/* Color coding the rows to easily see the spans */
tr:nth-child(2) td[colspan="3"] {
  background-color: #e3f2fd; /* Light Blue */
  color: #0d47a1;
}

tr:nth-child(3) td[colspan="2"] {
  background-color: #e8f5e9; /* Light Green */
  color: #1b5e20;
}

tr:nth-child(4) td:last-child {
  background-color: #fff3e0; /* Light Orange */
  color: #e65100;
  font-weight: bold;
}

/* Subtle styling for the empty/offset cells */
tr td:not([colspan]):empty {
  background-color: #fafafa;
  border: 1px dashed #eee; /* Makes empty tracks subtle */
}

</style>