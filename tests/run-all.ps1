# 전체 시험 실행 — 두 가지 출력 형식을 모두 읽는다
# ('N pass, M fail' 과 'N/N 통과')
$R = "c:\Users\yoona\OneDrive\문서\AlwaysonJoy"
# t20 · t23 은 진짜 크롬을 띄워 글줄이 실제로 어디서 갈리는지 재기 때문에 느리다 (수십 초)
$tests = @('t2','t3','t4','t5','t6','t7','t8','t9','test-char','t15','t16','t17','t18','t19','t20','t21','t22','t23','t24','t25','t26','t27')
$totP = 0; $totF = 0; $bad = @()

foreach ($t in $tests) {
  $f = Join-Path $PSScriptRoot "$t.js"
  if (-not (Test-Path $f)) { Write-Host "  ? $t 없음"; continue }
  $out = & node $f $R 2>&1 | Out-String
  $p = 0; $fl = 0
  if ($out -match '(\d+)\s*pass,\s*(\d+)\s*fail') { $p = [int]$Matches[1]; $fl = [int]$Matches[2] }
  elseif ($out -match '(\d+)\s*/\s*(\d+)\s*통과') { $p = [int]$Matches[1]; $fl = [int]$Matches[2] - $p }
  else { $bad += $t; Write-Host "  ! $t 결과를 못 읽음"; continue }
  $totP += $p; $totF += $fl
  $mark = if ($fl -eq 0) { 'ok' } else { 'FAIL' }
  Write-Host ("  {0,-10} {1,4} pass {2,3} fail  {3}" -f $t, $p, $fl, $mark)
  if ($fl -gt 0) {
    ($out -split "`n") | Where-Object { $_ -match '^\s+x ' } | ForEach-Object { Write-Host "        $_" }
  }
}
Write-Host ""
Write-Host ("합계: {0} pass, {1} fail" -f $totP, $totF)
if ($bad.Count) { Write-Host ("읽지 못한 시험: " + ($bad -join ', ')) }
