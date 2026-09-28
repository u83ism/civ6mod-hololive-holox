# Windowsかつ日本語ユーザー名環境でBLPが生成されない問題と回避策

**適用範囲: Windowsで、ユーザープロファイルのパス(`C:\Users\<ユーザー名>`)に日本語などASCII外の文字を含む環境だけ。** ユーザー名が英数字のみの環境では起きないので、この手順は不要。

## 症状

ModBuddyでビルドすると出力ウィンドウは`Build: 1 succeeded`(リビルドでも`Rebuild All: 1 succeeded`)と成功扱いになり、`Documents\My Games\Sid Meier's Civilization VI\Mods\<IconBuildプロジェクト名>\`にdds/tex/xlp/modinfoのコピーまでは出る。**しかし`Platforms\{Windows,MacOS}\BLPs\`が生成されない。** ゲーム内の見た目は古いBLPのまま変わらない。

2026-09-27に確認した2段階の失敗:

1. プロジェクトを`C:\Users\<日本語ユーザー名>\...`から開いた場合: `cooker.log`(プロジェクトフォルダ直下)に、ユーザー名部分が文字化けしたパスとともに次のエラーが出る
   ```
   Directory 'C:\Users\䂤⃝\Documents\...\tools\IconBuild' does not exist!  Who moved the pantry?
   ```
2. `subst`で英数字のドライブ(例: `X:`)を割り当て、そこからプロジェクトを開いた場合: 入力側(`--pantry`)のエラーは消えるが、出力側`--stewpot`/`--banquet_hall`がModBuddy固定の`C:\Users\<日本語ユーザー名>\Documents\My Games\...`のままなので、AssetCookerが全件`exited with code -1073740791`(0xC0000409、STATUS_STACK_BUFFER_OVERRUN)でクラッシュする。`cooker.log`は空。出力ウィンドウでこの行を見るには「ソリューションのリビルド」が必要(通常ビルドは`up-to-date`扱いでCookerの出力が出ないことがある)

**原因:** AssetCooker(`Civ6AssetCooker_FinalRelease.exe`)がASCII外のパスを扱えない。出力先はModBuddyが決めるため、**ModBuddy経由のビルドでは回避できない。**

## 回避策: AssetCookerを英数字パスだけで直接実行する

ModBuddyのビルドは使わず、ModBuddyが内部で呼んでいるのと同じコマンドを、入力・出力とも英数字パスにして直接実行する。XLP 1個あたり1秒未満で終わる。

1. リポジトリルートに英数字ドライブを割り当てる(再起動で消える。解除は`subst X: /d`)。**Claude Codeから実行する場合は、サンドボックス外(`dangerouslyDisableSandbox`)で実行しないと本人のセッションやModBuddyからは見えない**
   ```powershell
   subst X: "<リポジトリルート>"
   ```
2. 対象XLPをWindows/MacOSの両方でクックする(PowerShell、これもサンドボックス外で実行する)。`<Package>`はXLPのファイル名(例: `HoloX_Loading`)
   ```powershell
   $cooker = "C:\Program Files (x86)\Steam\steamapps\common\Sid Meier's Civilization VI SDK\AssetModTools\Cooker"
   $pantry = "C:\Program Files (x86)\Steam\steamapps\common\Sid Meier's Civilization VI SDK Assets\Civ6\pantry"
   foreach ($platform in 'Windows','MacOS') {
     & "$cooker\Civ6AssetCooker_FinalRelease.exe" --absolute_paths --no_mt --mode XLP --platform $platform `
       --pantry 'X:\tools\IconBuild' $pantry --stewpot "X:\tools\IconBuild\_cooked\$platform\BLPs" `
       --config "$cooker\Civ6.cfg" 'X:\tools\IconBuild\XLPs\<Package>.xlp'
   }
   ```
   成功すると`XLP cook completed with success.`と出て、`X:\tools\IconBuild\_cooked\<platform>\BLPs\UI\<Package>.blp`(`m_PackageName`が`UI/`始まりでない場合はその名前に応じた場所)が生成される。`Could not load digest key: ''.  Using mod key to sign BLP.`は無害(ModBuddy経由でも出る)
3. 生成された`.blp`を本体の`Platforms\{Windows,MacOS}\BLPs\`配下の同じ相対パスに上書きコピーし、`_cooked`フォルダは削除する(コミットしない)

この後の手順(`.modinfo`の`<Files>`登録・`.dep`・実機確認)はModBuddyでビルドした場合と同じ。BLPの中身を差し替えるだけで`Art.xml`を変えていなければ、`.dep`の再生成は不要。

## 未検証

- `FallbackLeaders.artdef`のようなArtDefのクック(`--mode ArtDef --banquet_hall <出力先> <artdefのパス>`)も同じ要領でできるはずだが、未検証。ModBuddyが実際に渡していた引数は、リビルド時の出力ウィンドウに全文が出るので、それをそのまま英数字パスに書き換えて使う
