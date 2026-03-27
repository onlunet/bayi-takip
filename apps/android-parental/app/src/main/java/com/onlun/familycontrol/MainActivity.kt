package com.onlun.familycontrol

import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.onlun.familycontrol.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
  private lateinit var binding: ActivityMainBinding
  private var allowedHost: String? = null

  private val prefs by lazy {
    getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    binding = ActivityMainBinding.inflate(layoutInflater)
    setContentView(binding.root)
    setSupportActionBar(binding.toolbar)

    binding.baseUrlInput.setText(getSavedBaseUrl())
    setupWebView()
    setupActions()
    setupBackNavigation()
    restoreStartupMode()
  }

  override fun onCreateOptionsMenu(menu: Menu): Boolean {
    menuInflater.inflate(R.menu.main_actions, menu)
    return true
  }

  override fun onOptionsItemSelected(item: MenuItem): Boolean {
    return when (item.itemId) {
      R.id.action_switch_profile -> {
        showModeChooserDialog(forceSelection = false)
        true
      }
      R.id.action_open_parent -> {
        openMode(AppMode.PARENT, persist = true)
        true
      }
      R.id.action_open_child -> {
        openMode(AppMode.CHILD, persist = true)
        true
      }
      R.id.action_open_admin -> {
        loadPanel(ADMIN_PATH)
        true
      }
      R.id.action_open_deletion -> {
        loadPanel(DELETE_PATH)
        true
      }
      R.id.action_clear_session -> {
        clearSession()
        true
      }
      else -> super.onOptionsItemSelected(item)
    }
  }

  private fun setupActions() {
    binding.btnOpenParent.setOnClickListener {
      openMode(AppMode.PARENT, persist = true)
    }
    binding.btnOpenChild.setOnClickListener {
      openMode(AppMode.CHILD, persist = true)
    }
    binding.btnOpenDeletion.setOnClickListener {
      loadPanel(DELETE_PATH)
    }
    binding.btnClearSession.setOnClickListener {
      clearSession()
    }
  }

  private fun setupBackNavigation() {
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        if (binding.webView.canGoBack()) {
          binding.webView.goBack()
        } else {
          isEnabled = false
          onBackPressedDispatcher.onBackPressed()
        }
      }
    })
  }

  private fun restoreStartupMode() {
    val savedMode = getSavedMode()
    if (savedMode == null) {
      showStatus(getString(R.string.status_mode_selection_required), isError = false)
      showModeChooserDialog(forceSelection = true)
      return
    }
    openMode(savedMode, persist = false)
  }

  private fun showModeChooserDialog(forceSelection: Boolean) {
    val options = arrayOf(
      getString(R.string.mode_parent),
      getString(R.string.mode_child)
    )

    val dialog = MaterialAlertDialogBuilder(this)
      .setTitle(getString(R.string.mode_chooser_title))
      .setMessage(getString(R.string.mode_chooser_message))
      .setCancelable(!forceSelection)
      .setItems(options) { _, which ->
        val mode = if (which == 0) AppMode.PARENT else AppMode.CHILD
        openMode(mode, persist = true)
      }

    if (!forceSelection) {
      dialog.setNegativeButton(getString(R.string.action_cancel), null)
    }

    dialog.show()
  }

  private fun openMode(mode: AppMode, persist: Boolean) {
    if (persist) {
      saveMode(mode)
    }
    val targetPath = when (mode) {
      AppMode.PARENT -> PARENT_PATH
      AppMode.CHILD -> CHILD_PATH
    }
    showStatus(
      if (mode == AppMode.PARENT) getString(R.string.status_mode_parent) else getString(R.string.status_mode_child),
      isError = false
    )
    loadPanel(targetPath)
  }

  private fun setupWebView() {
    val cookies = CookieManager.getInstance()
    cookies.setAcceptCookie(true)
    cookies.setAcceptThirdPartyCookies(binding.webView, false)

    with(binding.webView.settings) {
      javaScriptEnabled = true
      domStorageEnabled = true
      allowFileAccess = false
      allowContentAccess = false
      javaScriptCanOpenWindowsAutomatically = false
      mediaPlaybackRequiresUserGesture = true
      mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
    }

    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

    binding.webView.webViewClient = object : WebViewClient() {
      override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        binding.progressBar.isVisible = true
        showStatus(getString(R.string.status_loading), isError = false)
      }

      override fun onPageFinished(view: WebView?, url: String?) {
        binding.progressBar.isVisible = false
        showStatus(getString(R.string.status_loaded, url ?: "-"), isError = false)
      }

      override fun onReceivedSslError(
        view: WebView?,
        handler: SslErrorHandler?,
        error: android.net.http.SslError?
      ) {
        handler?.cancel()
        showStatus(getString(R.string.error_ssl), isError = true)
      }

      override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
      ) {
        if (request?.isForMainFrame == true) {
          showStatus(getString(R.string.error_load, error?.description ?: "unknown"), isError = true)
        }
      }

      override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val target = request?.url ?: return true
        return !isAllowedUrl(target)
      }

      @Suppress("DEPRECATION")
      override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
        val target = runCatching { Uri.parse(url.orEmpty()) }.getOrNull() ?: return true
        return !isAllowedUrl(target)
      }
    }

    binding.webView.webChromeClient = object : WebChromeClient() {
      override fun onProgressChanged(view: WebView?, newProgress: Int) {
        binding.progressBar.progress = newProgress
        binding.progressBar.isVisible = newProgress in 0..99
      }
    }
  }

  private fun loadPanel(path: String) {
    val baseUrl = normalizeBaseUrl(binding.baseUrlInput.text?.toString().orEmpty())
    if (baseUrl == null) {
      showStatus(getString(R.string.error_base_url), isError = true)
      return
    }

    val baseUri = Uri.parse(baseUrl)
    allowedHost = baseUri.host
    saveBaseUrl(baseUrl)

    val targetUrl = "$baseUrl$path"
    binding.webView.loadUrl(targetUrl)
  }

  private fun clearSession() {
    val cookies = CookieManager.getInstance()
    cookies.removeAllCookies(null)
    cookies.flush()

    binding.webView.stopLoading()
    binding.webView.clearHistory()
    binding.webView.clearCache(true)
    binding.webView.loadUrl("about:blank")
    showStatus(getString(R.string.status_session_cleared), isError = false)
  }

  private fun isAllowedUrl(uri: Uri): Boolean {
    if (uri.scheme != HTTPS_SCHEME) {
      showStatus(getString(R.string.error_blocked_url, uri.toString()), isError = true)
      return false
    }

    val host = uri.host
    val expectedHost = allowedHost
    if (!expectedHost.isNullOrBlank() && !host.equals(expectedHost, ignoreCase = true)) {
      showStatus(getString(R.string.error_host_mismatch, host ?: "-"), isError = true)
      return false
    }
    return true
  }

  private fun normalizeBaseUrl(raw: String): String? {
    val trimmed = raw.trim().removeSuffix("/")
    if (!trimmed.startsWith("$HTTPS_SCHEME://")) return null
    val host = runCatching { Uri.parse(trimmed).host }.getOrNull()
    if (host.isNullOrBlank()) return null
    return trimmed
  }

  private fun saveBaseUrl(url: String) {
    prefs.edit().putString(KEY_BASE_URL, url).apply()
  }

  private fun getSavedBaseUrl(): String {
    return prefs.getString(KEY_BASE_URL, BuildConfig.DEFAULT_BASE_URL) ?: BuildConfig.DEFAULT_BASE_URL
  }

  private fun saveMode(mode: AppMode) {
    prefs.edit().putString(KEY_APP_MODE, mode.name).apply()
  }

  private fun getSavedMode(): AppMode? {
    val raw = prefs.getString(KEY_APP_MODE, null) ?: return null
    return runCatching { AppMode.valueOf(raw) }.getOrNull()
  }

  private fun showStatus(text: String, isError: Boolean) {
    binding.statusText.text = text
    binding.statusText.setTextColor(
      if (isError) getColor(R.color.status_error) else getColor(R.color.status_ok)
    )
  }

  private enum class AppMode {
    PARENT,
    CHILD
  }

  companion object {
    private const val PREFS_NAME = "family_control_prefs"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_APP_MODE = "app_mode"
    private const val HTTPS_SCHEME = "https"

    private const val PARENT_PATH = "/parent-parental.html"
    private const val CHILD_PATH = "/child-parental.html"
    private const val ADMIN_PATH = "/parental-admin.html"
    private const val DELETE_PATH = "/account-deletion.html"
  }
}
