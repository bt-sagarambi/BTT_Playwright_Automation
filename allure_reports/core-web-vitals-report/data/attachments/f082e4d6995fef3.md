# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: regression_tests\US2\business-insights\improve-traffic\core-web-vitals\core.web.vitals.regression.spec.ts >> US2 Regression — Core Web Vitals (VitalScope) >> REG-CWV-008 — top filter combo: Device = Desktop
- Location: tests\regression_tests\US2\business-insights\improve-traffic\core-web-vitals\core.web.vitals.regression.spec.ts:111:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#table-for-performance-by-page-table')
Expected: visible
Received: undefined

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - button "Toggle menu visibility" [ref=e5] [cursor=pointer]: menu
        - link "Go to Digital Experience Overview":
          - /url: index.php?r=overview-dashboard/overview&sid=305836
          - img "Go to Digital Experience Overview" [ref=e8] [cursor=pointer]
        - generic [ref=e11]:
          - combobox [ref=e12]
          - combobox "GDC Test Site 2" [ref=e15] [cursor=pointer]:
            - generic "GDC Test Site 2" [ref=e16]
        - generic "Lock the Portal to have all data display from this site" [ref=e18] [cursor=pointer]
        - generic [ref=e19]:
          - text: Business Insights / Improve Traffic / Core Web Vitals (VitalScope)
          - generic [ref=e20] [cursor=pointer]: 
      - generic [ref=e21] [cursor=pointer]:
        - generic [ref=e22]: Get started
        - img [ref=e23]
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29] [cursor=pointer]: 
          - generic [ref=e30] [cursor=pointer]: "6"
        - text: 
    - generic [ref=e31]:
      - generic [ref=e32]: ADMINISTRATOR
      - button "Toggle user menu visibility" [ref=e33] [cursor=pointer]:
        - img [ref=e34]
      - button "Toggle settings menu visibility" [ref=e38] [cursor=pointer]:
        - img [ref=e40]
      - button "Help Center" [ref=e43] [cursor=pointer]:
        - img [ref=e44]
      - button "Blue Triangle Help Video" [ref=e49] [cursor=pointer]:
        - img [ref=e50]
      - button "Change theme" [ref=e54] [cursor=pointer]:
        - img [ref=e55]
      - button [ref=e57] [cursor=pointer]:
        - img [ref=e58]
      - link "Run Synthetic Instant Measurement" [ref=e64] [cursor=pointer]:
        - /url: /btportal/web/index.php?r=synthetic-monitors/instant&sid=305836
        - generic [ref=e65]: 
      - button "Toggle filters menu visibility" [ref=e66] [cursor=pointer]:
        - img [ref=e67]
      - button "Toggle feedback form visibility" [ref=e70] [cursor=pointer]:
        - img [ref=e71]
      - button "" [ref=e73] [cursor=pointer]:
        - generic [ref=e74]: 
      - link "$" [ref=e75] [cursor=pointer]:
        - /url: index.php?r=revenue-assurance/dashboard&sid=305836
        - generic [ref=e76]: $
      - text: 
    - text:   
  - text:                                                  $                                  $                                                                                                                             
  - main [ref=e77]:
    - generic [ref=e81]:
      - generic [ref=e82]:
        - generic [ref=e83]:
          - text:   
          - button "Hide Filters" [ref=e84] [cursor=pointer]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - text: "Real User:"
            - generic [ref=e87]: real user
          - generic [ref=e88]:
            - text: "Data Originated From:"
            - generic [ref=e89]: RUM Browser & Native Webview
          - generic [ref=e90]:
            - text: "Time Period:"
            - generic [ref=e91]: 1 day (2026-07-30 13:41 to 2026-07-31 13:41 IST (+5:30))
          - generic [ref=e92]:
            - text: "Device:"
            - img [ref=e94]:
              - generic "Mobile" [ref=e95]
          - generic [ref=e97]:
            - text: "Browser:"
            - generic [ref=e98]: All Browsers
          - generic [ref=e99]:
            - text: "OS:"
            - generic [ref=e100]: All OS
          - generic [ref=e101]:
            - text: "Bot Traffic:"
            - generic [ref=e102]: Exclude Bots
          - generic [ref=e103]:
            - text: "Statistical Method:"
            - generic [ref=e104]: Arithmetic Mean
          - generic [ref=e105]:
            - text: "WCD Data Inclusion:"
            - generic [ref=e106]: WCD Data & Non-WCD Data
      - generic [ref=e108]:
        - generic [ref=e109]:
          - heading "Performance Overview" [level=3] [ref=e110]
          - text: with
          - img [ref=e111]
          - button [ref=e117] [cursor=pointer]:
            - img [ref=e118]
        - generic [ref=e121]:
          - generic [ref=e122]:
            - generic [ref=e123]:
              - button [disabled]:
                - img
              - button [disabled]:
                - img
              - text: 1 to 10 (44)
              - button [ref=e124] [cursor=pointer]:
                - img [ref=e125]
              - button [ref=e127] [cursor=pointer]:
                - img [ref=e128]
              - combobox "Select page size" [ref=e132] [cursor=pointer]:
                - option "5 / page"
                - option "10 / page" [selected]
                - option "25 / page"
                - option "50 / page"
                - option "100 / page"
                - option "250 / page"
                - option "500 / page"
                - option "All"
            - generic:
              - generic [ref=e133]:
                - generic [ref=e134]: 
                - searchbox "Search..." [ref=e135]
                - generic [ref=e136]: 
                - img [ref=e137] [cursor=pointer]
              - generic [ref=e144] [cursor=pointer]: 
          - grid [ref=e147]:
            - rowgroup [ref=e148]:
              - row [ref=e149]:
                - 'columnheader "Page Name: No sort applied, activate to apply an ascending sort" [ref=e150]':
                  - generic [ref=e151]:
                    - text: Page Name
                    - img [ref=e152]
                - 'columnheader "Page Views: No sort applied, activate to apply an ascending sort" [ref=e154]':
                  - generic [ref=e155]:
                    - text: Page Views
                    - img [ref=e156]
                - 'columnheader "Onload (s): No sort applied, activate to apply an ascending sort" [ref=e158]':
                  - generic [ref=e159]:
                    - text: Onload
                    - emphasis [ref=e160]: (s)
                - 'columnheader "First Byte (s): No sort applied, activate to apply an ascending sort" [ref=e161]':
                  - generic [ref=e162]:
                    - text: First Byte
                    - emphasis [ref=e163]: (s)
                - 'columnheader "Largest Contentful Paint (s): No sort applied, activate to apply an ascending sort" [ref=e164]':
                  - generic [ref=e165]:
                    - text: Largest Contentful Paint
                    - emphasis [ref=e166]: (s)
                - 'columnheader "Interaction to Next Paint (s): No sort applied, activate to apply an ascending sort" [ref=e167]':
                  - generic [ref=e168]:
                    - text: Interaction to Next Paint
                    - emphasis [ref=e169]: (s)
                - 'columnheader "Cumulative Layout Shift: No sort applied, activate to apply an ascending sort" [ref=e170]':
                  - generic [ref=e171]:
                    - text: Cumulative Layout Shift
                    - img [ref=e172]
                - 'columnheader "LCP Time to First Byte (ms): No sort applied, activate to apply an ascending sort" [ref=e174]':
                  - generic [ref=e175]:
                    - text: LCP Time to First Byte
                    - emphasis [ref=e176]: (ms)
                - 'columnheader "LCP Resource Load Delay (ms): No sort applied, activate to apply an ascending sort" [ref=e177]':
                  - generic [ref=e178]:
                    - text: LCP Resource Load Delay
                    - emphasis [ref=e179]: (ms)
                - 'columnheader "LCP Resource Load Time (ms): No sort applied, activate to apply an ascending sort" [ref=e180]':
                  - generic [ref=e181]:
                    - text: LCP Resource Load Time
                    - emphasis [ref=e182]: (ms)
                - 'columnheader "LCP Element Render Delay (ms): No sort applied, activate to apply an ascending sort" [ref=e183]':
                  - generic [ref=e184]:
                    - text: LCP Element Render Delay
                    - emphasis [ref=e185]: (ms)
                - 'columnheader "LCP Time to First Byte (%): No sort applied, activate to apply an ascending sort" [ref=e186]':
                  - generic [ref=e187]:
                    - text: LCP Time to First Byte
                    - emphasis [ref=e188]: (%)
                - 'columnheader "LCP Resource Load Delay (%): No sort applied, activate to apply an ascending sort" [ref=e189]':
                  - generic [ref=e190]:
                    - text: LCP Resource Load Delay
                    - emphasis [ref=e191]: (%)
                - 'columnheader "LCP Resource Load Time (%): No sort applied, activate to apply an ascending sort" [ref=e192]':
                  - generic [ref=e193]:
                    - text: LCP Resource Load Time
                    - emphasis [ref=e194]: (%)
                - 'columnheader "LCP Element Render Delay (%): No sort applied, activate to apply an ascending sort" [ref=e195]':
                  - generic [ref=e196]:
                    - text: LCP Element Render Delay
                    - emphasis [ref=e197]: (%)
                - 'columnheader "CLS Largest Shift Start (ms): No sort applied, activate to apply an ascending sort" [ref=e198]':
                  - generic [ref=e199]:
                    - text: CLS Largest Shift Start
                    - emphasis [ref=e200]: (ms)
                - 'columnheader "CLS Layout Shift Count: No sort applied, activate to apply an ascending sort" [ref=e201]':
                  - generic [ref=e202]: CLS Layout Shift Count
            - rowgroup [ref=e203]:
              - row "  PDP 199,159 3.58 1.14  4.56  0.271  0.301 1266 4469 132 2600 33.09% 66.14% 2.76% 45.83% 12329 10" [ref=e204]:
                - gridcell "  PDP" [ref=e205]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e206] [cursor=pointer]: 
                  - generic [ref=e207] [cursor=pointer]: 
                  - text: PDP
                - gridcell "199,159" [ref=e208]
                - gridcell "3.58" [ref=e209]
                - gridcell "1.14" [ref=e210]
                - gridcell " 4.56" [ref=e211]:
                  - generic "VitalScope Data Available" [ref=e212] [cursor=pointer]: 
                  - generic [ref=e213]: "4.56"
                - gridcell " 0.271" [ref=e214]:
                  - generic "VitalScope Data Available" [ref=e215] [cursor=pointer]: 
                  - generic [ref=e216]: "0.271"
                - gridcell " 0.301" [ref=e217]:
                  - generic "VitalScope Data Available" [ref=e218] [cursor=pointer]: 
                  - generic [ref=e219]: "0.301"
                - gridcell "1266" [ref=e220]
                - gridcell "4469" [ref=e221]
                - gridcell "132" [ref=e222]
                - gridcell "2600" [ref=e223]
                - gridcell "33.09%" [ref=e224]
                - gridcell "66.14%" [ref=e225]
                - gridcell "2.76%" [ref=e226]
                - gridcell "45.83%" [ref=e227]
                - gridcell "12329" [ref=e228]
                - gridcell "10" [ref=e229]
              - row "  Category 77,089 2.65 0.89  3.31  0.262  0.452 990 3458 107 1400 44.83% 69.13% 2.81% 33.53% 12668 9" [ref=e230]:
                - gridcell "  Category" [ref=e231]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e232] [cursor=pointer]: 
                  - generic [ref=e233] [cursor=pointer]: 
                  - text: Category
                - gridcell "77,089" [ref=e234]
                - gridcell "2.65" [ref=e235]
                - gridcell "0.89" [ref=e236]
                - gridcell " 3.31" [ref=e237]:
                  - generic "VitalScope Data Available" [ref=e238] [cursor=pointer]: 
                  - generic [ref=e239]: "3.31"
                - gridcell " 0.262" [ref=e240]:
                  - generic "VitalScope Data Available" [ref=e241] [cursor=pointer]: 
                  - generic [ref=e242]: "0.262"
                - gridcell " 0.452" [ref=e243]:
                  - generic "VitalScope Data Available" [ref=e244] [cursor=pointer]: 
                  - generic [ref=e245]: "0.452"
                - gridcell "990" [ref=e246]
                - gridcell "3458" [ref=e247]
                - gridcell "107" [ref=e248]
                - gridcell "1400" [ref=e249]
                - gridcell "44.83%" [ref=e250]
                - gridcell "69.13%" [ref=e251]
                - gridcell "2.81%" [ref=e252]
                - gridcell "33.53%" [ref=e253]
                - gridcell "12668" [ref=e254]
                - gridcell "9" [ref=e255]
              - row "  Category-vt 57,576 4.52 0.00 N/A  0.243 N/A - - - - - - - - - -" [ref=e256]:
                - gridcell "  Category-vt" [ref=e257]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e258] [cursor=pointer]: 
                  - generic [ref=e259] [cursor=pointer]: 
                  - text: Category-vt
                - gridcell "57,576" [ref=e260]
                - gridcell "4.52" [ref=e261]
                - gridcell "0.00" [ref=e262]
                - gridcell "N/A" [ref=e263]
                - gridcell " 0.243" [ref=e264]:
                  - generic "VitalScope Data Available" [ref=e265] [cursor=pointer]: 
                  - generic [ref=e266]: "0.243"
                - gridcell "N/A" [ref=e267]
                - gridcell "-" [ref=e268]
                - gridcell "-" [ref=e269]
                - gridcell "-" [ref=e270]
                - gridcell "-" [ref=e271]
                - gridcell "-" [ref=e272]
                - gridcell "-" [ref=e273]
                - gridcell "-" [ref=e274]
                - gridcell "-" [ref=e275]
                - gridcell "-" [ref=e276]
                - gridcell "-" [ref=e277]
              - row "  Search Results-vt 44,672 9.09 0.00 N/A  0.257 N/A - - - - - - - - - -" [ref=e278]:
                - gridcell "  Search Results-vt" [ref=e279]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e280] [cursor=pointer]: 
                  - generic [ref=e281] [cursor=pointer]: 
                  - text: Search Results-vt
                - gridcell "44,672" [ref=e282]
                - gridcell "9.09" [ref=e283]
                - gridcell "0.00" [ref=e284]
                - gridcell "N/A" [ref=e285]
                - gridcell " 0.257" [ref=e286]:
                  - generic "VitalScope Data Available" [ref=e287] [cursor=pointer]: 
                  - generic [ref=e288]: "0.257"
                - gridcell "N/A" [ref=e289]
                - gridcell "-" [ref=e290]
                - gridcell "-" [ref=e291]
                - gridcell "-" [ref=e292]
                - gridcell "-" [ref=e293]
                - gridcell "-" [ref=e294]
                - gridcell "-" [ref=e295]
                - gridcell "-" [ref=e296]
                - gridcell "-" [ref=e297]
                - gridcell "-" [ref=e298]
                - gridcell "-" [ref=e299]
              - row "  Homepage 40,282 3.89 0.98  4.65  0.263  0.517 1302 3272 159 1665 33.28% 64.55% 3.03% 26.1% 10807 15" [ref=e300]:
                - gridcell "  Homepage" [ref=e301]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e302] [cursor=pointer]: 
                  - generic [ref=e303] [cursor=pointer]: 
                  - text: Homepage
                - gridcell "40,282" [ref=e304]
                - gridcell "3.89" [ref=e305]
                - gridcell "0.98" [ref=e306]
                - gridcell " 4.65" [ref=e307]:
                  - generic "VitalScope Data Available" [ref=e308] [cursor=pointer]: 
                  - generic [ref=e309]: "4.65"
                - gridcell " 0.263" [ref=e310]:
                  - generic "VitalScope Data Available" [ref=e311] [cursor=pointer]: 
                  - generic [ref=e312]: "0.263"
                - gridcell " 0.517" [ref=e313]:
                  - generic "VitalScope Data Available" [ref=e314] [cursor=pointer]: 
                  - generic [ref=e315]: "0.517"
                - gridcell "1302" [ref=e316]
                - gridcell "3272" [ref=e317]
                - gridcell "159" [ref=e318]
                - gridcell "1665" [ref=e319]
                - gridcell "33.28%" [ref=e320]
                - gridcell "64.55%" [ref=e321]
                - gridcell "3.03%" [ref=e322]
                - gridcell "26.1%" [ref=e323]
                - gridcell "10807" [ref=e324]
                - gridcell "15" [ref=e325]
              - row "  Sitelet Landing 32,987 2.79 0.87  3.63  0.226  0.504 1037 3223 128 2025 38.62% 67.5% 3.11% 39.86% 12824 11" [ref=e326]:
                - gridcell "  Sitelet Landing" [ref=e327]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e328] [cursor=pointer]: 
                  - generic [ref=e329] [cursor=pointer]: 
                  - text: Sitelet Landing
                - gridcell "32,987" [ref=e330]
                - gridcell "2.79" [ref=e331]
                - gridcell "0.87" [ref=e332]
                - gridcell " 3.63" [ref=e333]:
                  - generic "VitalScope Data Available" [ref=e334] [cursor=pointer]: 
                  - generic [ref=e335]: "3.63"
                - gridcell " 0.226" [ref=e336]:
                  - generic "VitalScope Data Available" [ref=e337] [cursor=pointer]: 
                  - generic [ref=e338]: "0.226"
                - gridcell " 0.504" [ref=e339]:
                  - generic "VitalScope Data Available" [ref=e340] [cursor=pointer]: 
                  - generic [ref=e341]: "0.504"
                - gridcell "1037" [ref=e342]
                - gridcell "3223" [ref=e343]
                - gridcell "128" [ref=e344]
                - gridcell "2025" [ref=e345]
                - gridcell "38.62%" [ref=e346]
                - gridcell "67.5%" [ref=e347]
                - gridcell "3.11%" [ref=e348]
                - gridcell "39.86%" [ref=e349]
                - gridcell "12824" [ref=e350]
                - gridcell "11" [ref=e351]
              - row "  Search Results 29,659 2.60 1.03  2.75  0.221  0.311 1099 3684 75 746 60.04% 68.12% 2.52% 19.49% 11293 7" [ref=e352]:
                - gridcell "  Search Results" [ref=e353]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e354] [cursor=pointer]: 
                  - generic [ref=e355] [cursor=pointer]: 
                  - text: Search Results
                - gridcell "29,659" [ref=e356]
                - gridcell "2.60" [ref=e357]
                - gridcell "1.03" [ref=e358]
                - gridcell " 2.75" [ref=e359]:
                  - generic "VitalScope Data Available" [ref=e360] [cursor=pointer]: 
                  - generic [ref=e361]: "2.75"
                - gridcell " 0.221" [ref=e362]:
                  - generic "VitalScope Data Available" [ref=e363] [cursor=pointer]: 
                  - generic [ref=e364]: "0.221"
                - gridcell " 0.311" [ref=e365]:
                  - generic "VitalScope Data Available" [ref=e366] [cursor=pointer]: 
                  - generic [ref=e367]: "0.311"
                - gridcell "1099" [ref=e368]
                - gridcell "3684" [ref=e369]
                - gridcell "75" [ref=e370]
                - gridcell "746" [ref=e371]
                - gridcell "60.04%" [ref=e372]
                - gridcell "68.12%" [ref=e373]
                - gridcell "2.52%" [ref=e374]
                - gridcell "19.49%" [ref=e375]
                - gridcell "11293" [ref=e376]
                - gridcell "7" [ref=e377]
              - row "  Sitelet Landing-vt 19,602 4.17 0.00 N/A  0.253 N/A - - - - - - - - - -" [ref=e378]:
                - gridcell "  Sitelet Landing-vt" [ref=e379]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e380] [cursor=pointer]: 
                  - generic [ref=e381] [cursor=pointer]: 
                  - text: Sitelet Landing-vt
                - gridcell "19,602" [ref=e382]
                - gridcell "4.17" [ref=e383]
                - gridcell "0.00" [ref=e384]
                - gridcell "N/A" [ref=e385]
                - gridcell " 0.253" [ref=e386]:
                  - generic "VitalScope Data Available" [ref=e387] [cursor=pointer]: 
                  - generic [ref=e388]: "0.253"
                - gridcell "N/A" [ref=e389]
                - gridcell "-" [ref=e390]
                - gridcell "-" [ref=e391]
                - gridcell "-" [ref=e392]
                - gridcell "-" [ref=e393]
                - gridcell "-" [ref=e394]
                - gridcell "-" [ref=e395]
                - gridcell "-" [ref=e396]
                - gridcell "-" [ref=e397]
                - gridcell "-" [ref=e398]
                - gridcell "-" [ref=e399]
              - row "  Checkout-vt 8,678 5.84 0.00 N/A  0.211 N/A - - - - - - - - - -" [ref=e400]:
                - gridcell "  Checkout-vt" [ref=e401]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e402] [cursor=pointer]: 
                  - generic [ref=e403] [cursor=pointer]: 
                  - text: Checkout-vt
                - gridcell "8,678" [ref=e404]
                - gridcell "5.84" [ref=e405]
                - gridcell "0.00" [ref=e406]
                - gridcell "N/A" [ref=e407]
                - gridcell " 0.211" [ref=e408]:
                  - generic "VitalScope Data Available" [ref=e409] [cursor=pointer]: 
                  - generic [ref=e410]: "0.211"
                - gridcell "N/A" [ref=e411]
                - gridcell "-" [ref=e412]
                - gridcell "-" [ref=e413]
                - gridcell "-" [ref=e414]
                - gridcell "-" [ref=e415]
                - gridcell "-" [ref=e416]
                - gridcell "-" [ref=e417]
                - gridcell "-" [ref=e418]
                - gridcell "-" [ref=e419]
                - gridcell "-" [ref=e420]
                - gridcell "-" [ref=e421]
              - row "  Checkout Shopping Cart 4,592 3.94 1.32  4.55  0.279  0.821 1654 3864 139 6930 45.3% 65.67% 3.96% 46.14% 14515 10" [ref=e422]:
                - gridcell "  Checkout Shopping Cart" [ref=e423]:
                  - generic "Show top 50 URLs for this page (limited to a 7-day range)" [ref=e424] [cursor=pointer]: 
                  - generic [ref=e425] [cursor=pointer]: 
                  - text: Checkout Shopping Cart
                - gridcell "4,592" [ref=e426]
                - gridcell "3.94" [ref=e427]
                - gridcell "1.32" [ref=e428]
                - gridcell " 4.55" [ref=e429]:
                  - generic "VitalScope Data Available" [ref=e430] [cursor=pointer]: 
                  - generic [ref=e431]: "4.55"
                - gridcell " 0.279" [ref=e432]:
                  - generic "VitalScope Data Available" [ref=e433] [cursor=pointer]: 
                  - generic [ref=e434]: "0.279"
                - gridcell " 0.821" [ref=e435]:
                  - generic "VitalScope Data Available" [ref=e436] [cursor=pointer]: 
                  - generic [ref=e437]: "0.821"
                - gridcell "1654" [ref=e438]
                - gridcell "3864" [ref=e439]
                - gridcell "139" [ref=e440]
                - gridcell "6930" [ref=e441]
                - gridcell "45.3%" [ref=e442]
                - gridcell "65.67%" [ref=e443]
                - gridcell "3.96%" [ref=e444]
                - gridcell "46.14%" [ref=e445]
                - gridcell "14515" [ref=e446]
                - gridcell "10" [ref=e447]
              - text:                                                                                                                                             
      - generic [ref=e448]:
        - generic [ref=e449]:
          - generic [ref=e450]:
            - button "Country" [ref=e451] [cursor=pointer]
            - button "Region" [ref=e452] [cursor=pointer]
            - button "Browser" [ref=e453] [cursor=pointer]
            - button "ISP / Organization" [ref=e454] [cursor=pointer]
            - button "Traffic Source / Referrer" [ref=e455] [cursor=pointer]
          - generic [ref=e456]:
            - generic [ref=e458] [cursor=pointer]: 
            - generic [ref=e460] [cursor=pointer]: 
          - generic [ref=e462]:
            - generic [ref=e464]:
              - img "Performance By Country" [ref=e465]:
                - generic [ref=e472]: Values
                - generic "Chart Context Menu" [ref=e514] [cursor=pointer]
                - generic [ref=e517]:
                  - generic [ref=e519]:
                    - generic [ref=e520]: 4.02s
                    - text: 4.02s
                  - generic [ref=e522]:
                    - generic [ref=e523]: 3.83s
                    - text: 3.83s
                  - generic [ref=e525]:
                    - generic [ref=e526]: 5.5s
                    - text: 5.5s
                  - generic [ref=e528]:
                    - generic [ref=e529]: 6.43s
                    - text: 6.43s
                  - generic [ref=e531]:
                    - generic [ref=e532]: 6.85s
                    - text: 6.85s
                  - generic [ref=e534]:
                    - generic [ref=e535]: 1.79s
                    - text: 1.79s
                  - generic [ref=e537]:
                    - generic [ref=e538]: 5.06s
                    - text: 5.06s
                  - generic [ref=e540]:
                    - generic [ref=e541]: 3.19s
                    - text: 3.19s
                  - generic [ref=e543]:
                    - generic [ref=e544]: 4.7s
                    - text: 4.7s
                  - generic [ref=e546]:
                    - generic [ref=e547]: 6.98s
                    - text: 6.98s
                  - generic [ref=e549]:
                    - generic [ref=e550]: 3.95s
                    - text: 3.95s
                  - generic [ref=e552]:
                    - generic [ref=e553]: 8.52s
                    - text: 8.52s
                  - generic [ref=e555]:
                    - generic [ref=e556]: 4.22s
                    - text: 4.22s
                  - generic [ref=e558]:
                    - generic [ref=e559]: 8.77s
                    - text: 8.77s
                  - generic [ref=e561]:
                    - generic [ref=e562]: 15.87s
                    - text: 15.87s
                  - generic [ref=e564]:
                    - generic [ref=e565]: 6.49s
                    - text: 6.49s
                  - generic [ref=e567]:
                    - generic [ref=e568]: 5.87s
                    - text: 5.87s
                  - generic [ref=e570]:
                    - generic [ref=e571]: 6.92s
                    - text: 6.92s
                  - generic [ref=e573]:
                    - generic [ref=e574]: 2.54s
                    - text: 2.54s
                  - generic [ref=e576]:
                    - generic [ref=e577]: 11.76s
                    - text: 11.76s
                  - generic [ref=e579]:
                    - generic [ref=e580]: 10.68s
                    - text: 10.68s
                  - generic [ref=e582]:
                    - generic [ref=e583]: 7.89s
                    - text: 7.89s
                  - generic [ref=e585]:
                    - generic [ref=e586]: 23.88s
                    - text: 23.88s
                  - generic [ref=e588]:
                    - generic [ref=e589]: 9.3s
                    - text: 9.3s
                  - generic [ref=e591]:
                    - generic [ref=e592]: 5.98s
                    - text: 5.98s
                  - generic [ref=e594]:
                    - generic [ref=e595]: 22.73s
                    - text: 22.73s
                  - generic [ref=e597]:
                    - generic [ref=e598]: 2.27s
                    - text: 2.27s
                  - generic [ref=e600]:
                    - generic [ref=e601]: 21.92s
                    - text: 21.92s
                  - generic [ref=e603]:
                    - generic [ref=e604]: 15.54s
                    - text: 15.54s
                  - generic [ref=e606]:
                    - generic [ref=e607]: 12.28s
                    - text: 12.28s
                  - generic [ref=e609]:
                    - generic [ref=e610]: 2.14s
                    - text: 2.14s
                  - generic [ref=e612]:
                    - generic [ref=e613]: 3.51s
                    - text: 3.51s
                  - generic [ref=e615]:
                    - generic [ref=e616]: 6.29s
                    - text: 6.29s
                  - generic [ref=e618]:
                    - generic [ref=e619]: 2.45s
                    - text: 2.45s
                  - generic [ref=e621]:
                    - generic [ref=e622]: 10.47s
                    - text: 10.47s
                  - generic [ref=e624]:
                    - generic [ref=e625]: 3.88s
                    - text: 3.88s
                  - generic [ref=e627]:
                    - generic [ref=e628]: 8s
                    - text: 8s
                  - generic [ref=e630]:
                    - generic [ref=e631]: 2.98s
                    - text: 2.98s
                - generic [ref=e635]:
                  - generic [ref=e637] [cursor=pointer]: Onload
                  - generic [ref=e640] [cursor=pointer]: TCP
                  - generic [ref=e643] [cursor=pointer]: First Byte
                  - generic [ref=e646] [cursor=pointer]: DNS
                  - generic [ref=e649] [cursor=pointer]: DOM Duration
                  - generic [ref=e652] [cursor=pointer]: SSL
                  - generic [ref=e655] [cursor=pointer]: Redirect
                  - generic [ref=e658] [cursor=pointer]: Base Page
                  - generic [ref=e661] [cursor=pointer]: Time To DOM Interactive
                  - generic [ref=e664] [cursor=pointer]: Time To DOM Content Loaded
                  - generic [ref=e667] [cursor=pointer]: TEST OVERRIDE
                  - generic [ref=e670] [cursor=pointer]: First Contentful Paint
                  - generic [ref=e673] [cursor=pointer]: Largest Contentful Paint
                  - generic [ref=e676] [cursor=pointer]: Total Blocking Time
                  - generic [ref=e679] [cursor=pointer]: INP
                  - generic [ref=e682] [cursor=pointer]: Cumulative Layout Shift
                - generic [ref=e684]:
                  - generic [ref=e685]: "0"
                  - generic [ref=e686]: "10"
                  - generic [ref=e687]: "20"
                  - generic [ref=e688]: "30"
                  - generic [ref=e689]: "5"
                  - generic [ref=e690]: "15"
                  - generic [ref=e691]: "25"
                - generic [ref=e692]:
                  - generic [ref=e693]: United States
                  - generic [ref=e694]: Canada
                  - generic [ref=e695]: Mexico
                  - generic [ref=e696]: United Arab Emirates
                  - generic [ref=e697]: United Kingdom
                  - generic [ref=e698]: Hungary
                  - generic [ref=e699]: Bahamas
                  - generic [ref=e700]: Cook Islands
                  - generic [ref=e701]: Puerto Rico
                  - generic [ref=e702]: Australia
                  - generic [ref=e703]: Japan
                  - generic [ref=e704]: Albania
                  - generic [ref=e705]: South Africa
                  - generic [ref=e706]: Korea, Republic Of
                  - generic [ref=e707]: Singapore
                  - generic [ref=e708]: Italy
                  - generic [ref=e709]: Poland
                  - generic [ref=e710]: Brazil
                  - generic [ref=e711]: Germany
                  - generic [ref=e712]: France
                  - generic [ref=e713]: Croatia Local Name:Hrvatska
                  - generic [ref=e714]: Netherlands
                  - generic [ref=e715]: Philippines
                  - generic [ref=e716]: Romania
                  - generic [ref=e717]: Saint Vincent And TheGrenadines
                  - generic [ref=e718]: Argentina
                  - generic [ref=e719]: Bermuda
                  - generic [ref=e720]: Colombia
                  - generic [ref=e721]: Costa Rica
                  - generic [ref=e722]: Ecuador
                  - generic [ref=e723]: Ireland
                  - generic [ref=e724]: Iceland
                  - generic [ref=e725]: Jordan
                  - generic [ref=e726]: Mf
                  - generic [ref=e727]: Mongolia
                  - generic [ref=e728]: Saudi Arabia
                  - generic [ref=e729]: Sweden
                  - generic [ref=e730]: Virgin Islands U.S.
              - generic [ref=e731]: Performance By Country
            - text:                         
        - img [ref=e735]:
          - generic [ref=e939]:
            - generic "Zoom in" [ref=e940] [cursor=pointer]
            - generic "Zoom out" [ref=e943] [cursor=pointer]
          - generic [ref=e945]: Times By Geography
          - generic [ref=e953]:
            - generic [ref=e954]: 0 s
            - generic [ref=e955]: 10 s
            - generic [ref=e956]: 20 s
            - generic [ref=e957]: 30 s
  - text:                          $          
```

# Test source

```ts
  280 |     await this.page.waitForTimeout(800);
  281 | 
  282 |     const aliases = timePeriodAliases(label);
  283 |     let clicked = false;
  284 |     for (const alias of aliases) {
  285 |       const preset = this.page
  286 |         .locator('.daterangepicker li, .ranges li, button.time-option, .daterangepicker .ranges label')
  287 |         .filter({ hasText: new RegExp(escapeRegExp(alias), 'i') })
  288 |         .first();
  289 |       if (await preset.isVisible().catch(() => false)) {
  290 |         await preset.click({ force: true });
  291 |         clicked = true;
  292 |         break;
  293 |       }
  294 |     }
  295 |     if (!clicked) {
  296 |       const token = label.replace(/last\s*/i, '').trim();
  297 |       const soft = this.page
  298 |         .locator('.daterangepicker li, .ranges li, button.time-option')
  299 |         .filter({ hasText: new RegExp(escapeRegExp(token), 'i') })
  300 |         .first();
  301 |       await expect(soft, `Time Period preset "${label}"`).toBeVisible({ timeout: 10000 });
  302 |       await soft.click({ force: true });
  303 |     }
  304 |     await this.page.keyboard.press('Escape').catch(() => undefined);
  305 |     await this.page.waitForTimeout(400);
  306 |   }
  307 | 
  308 |   async applyTimePeriod(timePeriod: string): Promise<void> {
  309 |     await this.openRightNavFilters();
  310 |     await this.selectTimePeriodPreset(timePeriod);
  311 |     const apply = this.page
  312 |       .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
  313 |       .filter({ visible: true })
  314 |       .first();
  315 |     await apply.click({ force: true });
  316 |     await this.page.waitForTimeout(4000);
  317 |     await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 60000 });
  318 |   }
  319 | 
  320 |   async applySampleFilterCombo(): Promise<void> {
  321 |     await this.openRightNavFilters();
  322 |     // Sample: leave defaults where possible; ensure Apply works
  323 |     const apply = this.page
  324 |       .locator('#apply-filters, button:has-text("Apply Filters"), a.btn:has-text("Apply Filters")')
  325 |       .filter({ visible: true })
  326 |       .first();
  327 |     await apply.click({ force: true });
  328 |     await this.page.waitForTimeout(3000);
  329 |     await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 60000 });
  330 |   }
  331 | 
  332 |   async toggleViewFilters(): Promise<'shown' | 'hidden' | 'unchanged'> {
  333 |     const btn = this.locators.viewFiltersButton;
  334 |     const banner = this.locators.viewFiltersBanner;
  335 |     await expect(btn).toBeVisible({ timeout: 15000 });
  336 |     const wasVisible = await banner.isVisible().catch(() => false);
  337 |     await btn.click();
  338 |     await this.page.waitForTimeout(700);
  339 |     const isVisible = await banner.isVisible().catch(() => false);
  340 |     if (isVisible && !wasVisible) return 'shown';
  341 |     if (!isVisible && wasVisible) return 'hidden';
  342 |     return 'unchanged';
  343 |   }
  344 | 
  345 |   /** Ensure the top filter badge strip (#toggle-filter-section) is visible via View Filters. */
  346 |   async ensureTopFiltersVisible(): Promise<void> {
  347 |     const banner = this.locators.viewFiltersBanner;
  348 |     if (await banner.isVisible().catch(() => false)) {
  349 |       if (await this.locators.dataOriginBadge.isVisible().catch(() => false)) return;
  350 |     }
  351 |     await this.locators.viewFiltersButton.click({ force: true });
  352 |     await this.page.waitForTimeout(700);
  353 |     if (!(await banner.isVisible().catch(() => false))) {
  354 |       await this.locators.viewFiltersButton.click({ force: true });
  355 |       await this.page.waitForTimeout(700);
  356 |     }
  357 |     await expect(this.locators.dataOriginBadge).toBeVisible({ timeout: 15000 });
  358 |   }
  359 | 
  360 |   async expectTopFilterBadges(): Promise<void> {
  361 |     await this.ensureTopFiltersVisible();
  362 |     await expect(this.locators.dataOriginBadge).toBeVisible({ timeout: 15000 });
  363 |     await expect(this.locators.timePeriodBadge).toBeVisible();
  364 |     await expect(this.locators.deviceBadge).toBeVisible();
  365 |     await expect(this.locators.browserBadge).toBeVisible();
  366 |   }
  367 | 
  368 |   async getTopBadgeText(which: 'dataOrigin' | 'timePeriod' | 'device' | 'browser' | 'bucketSize'): Promise<string> {
  369 |     const map = {
  370 |       dataOrigin: this.locators.dataOriginBadge,
  371 |       timePeriod: this.locators.timePeriodBadge,
  372 |       device: this.locators.deviceBadge,
  373 |       browser: this.locators.browserBadge,
  374 |       bucketSize: this.locators.bucketSizeBadge,
  375 |     } as const;
  376 |     return ((await map[which].textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  377 |   }
  378 | 
  379 |   async expectGridRefreshed(): Promise<{ rows: number }> {
> 380 |     await expect(this.locators.performanceByPageTable).toBeVisible({ timeout: 60000 });
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  381 |     await expect
  382 |       .poll(async () => this.locators.performanceByPageTable.locator('tbody tr').count(), {
  383 |         timeout: 60000,
  384 |       })
  385 |       .toBeGreaterThan(0);
  386 |     const rows = await this.locators.performanceByPageTable.locator('tbody tr').count();
  387 |     return { rows };
  388 |   }
  389 | 
  390 |   private async closeOpenQuickFilters(): Promise<void> {
  391 |     await this.page.keyboard.press('Escape').catch(() => undefined);
  392 |     await this.page.waitForTimeout(200);
  393 |     await this.page
  394 |       .evaluate(() => {
  395 |         document.querySelectorAll('.flex-dropdown').forEach((el) => {
  396 |           (el as HTMLElement).style.display = 'none';
  397 |         });
  398 |       })
  399 |       .catch(() => undefined);
  400 |   }
  401 | 
  402 |   private async clickQuickApply(menu: Locator): Promise<void> {
  403 |     const apply = menu.locator('button.btn-success, button:has-text("Apply")').first();
  404 |     await expect(apply).toBeVisible({ timeout: 10000 });
  405 |     await apply.click({ force: true });
  406 |     await this.page.waitForTimeout(4000);
  407 |     await this.expectGridRefreshed();
  408 |   }
  409 | 
  410 |   private async selectNativeOrSelect2(selectCss: string, optionText: string | RegExp): Promise<void> {
  411 |     const select = this.page.locator(selectCss).first();
  412 |     await expect(select).toBeAttached({ timeout: 15000 });
  413 |     const id = (await select.getAttribute('id')) || selectCss.replace('#', '');
  414 |     const container = this.page.locator(`#select2-${id}-container`).first();
  415 |     if (await container.isVisible().catch(() => false)) {
  416 |       await container.click({ force: true });
  417 |       await this.page.waitForTimeout(300);
  418 |       const opt = this.page.locator('.select2-results__option').filter({ hasText: optionText }).first();
  419 |       await expect(opt).toBeVisible({ timeout: 10000 });
  420 |       await opt.click();
  421 |       return;
  422 |     }
  423 |     const labels = (await select.locator('option').allTextContents()).map((t) => t.trim()).filter(Boolean);
  424 |     const label =
  425 |       typeof optionText === 'string'
  426 |         ? labels.find((t) => t === optionText) ||
  427 |           labels.find((t) => t.toLowerCase().includes(optionText.toLowerCase()))
  428 |         : labels.find((t) => optionText.test(t));
  429 |     expect(label, `Option ${optionText} in ${selectCss}`).toBeTruthy();
  430 |     await select.selectOption({ label: label! });
  431 |   }
  432 | 
  433 |   private async selectQuickSelect2(selectId: string, optionText: string | RegExp): Promise<void> {
  434 |     const container = this.page.locator(`#select2-${selectId}-container`).first();
  435 |     if (await container.isVisible().catch(() => false)) {
  436 |       await container.click({ force: true });
  437 |       await this.page.waitForTimeout(300);
  438 |       const opt = this.page.locator('.select2-results__option').filter({ hasText: optionText }).first();
  439 |       await expect(opt).toBeVisible({ timeout: 10000 });
  440 |       await opt.click();
  441 |       return;
  442 |     }
  443 |     await this.selectNativeOrSelect2(`#${selectId}`, optionText);
  444 |   }
  445 | 
  446 |   async applyTopDataOrigin(option: string | RegExp): Promise<void> {
  447 |     await this.ensureTopFiltersVisible();
  448 |     await this.closeOpenQuickFilters();
  449 |     await this.locators.dataOriginBadge.click({ force: true });
  450 |     await expect(this.locators.quickDataOriginFilter).toBeVisible({ timeout: 10000 });
  451 |     await this.selectQuickSelect2('data-origin-quick-select', option);
  452 |     await this.clickQuickApply(this.locators.quickDataOriginFilter);
  453 |   }
  454 | 
  455 |   async applyTopDevices(devices: Array<'Mobile' | 'Desktop'>, opts?: { clearOthers?: boolean }): Promise<void> {
  456 |     await this.ensureTopFiltersVisible();
  457 |     await this.closeOpenQuickFilters();
  458 |     await this.locators.deviceBadge.click({ force: true });
  459 |     await expect(this.locators.quickDeviceFilter).toBeVisible({ timeout: 10000 });
  460 |     const clearOthers = opts?.clearOthers !== false;
  461 |     for (const id of ['quick-mobile-device', 'quick-desktop-device'] as const) {
  462 |       const box = this.page.locator(`#${id}`);
  463 |       const want =
  464 |         (id === 'quick-mobile-device' && devices.includes('Mobile')) ||
  465 |         (id === 'quick-desktop-device' && devices.includes('Desktop'));
  466 |       const checked = await box.isChecked().catch(() => false);
  467 |       if (want && !checked) await box.check({ force: true });
  468 |       if (!want && clearOthers && checked) await box.uncheck({ force: true });
  469 |     }
  470 |     await this.clickQuickApply(this.locators.quickDeviceFilter);
  471 |   }
  472 | 
  473 |   async applyTopBrowsers(
  474 |     browsers: Array<'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Facebook'>,
  475 |     opts?: { clearOthers?: boolean }
  476 |   ): Promise<void> {
  477 |     await this.ensureTopFiltersVisible();
  478 |     await this.closeOpenQuickFilters();
  479 |     await this.locators.browserBadge.click({ force: true });
  480 |     await expect(this.locators.quickBrowserFilter).toBeVisible({ timeout: 10000 });
```