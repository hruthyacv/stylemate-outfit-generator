import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../widgets/widgets.dart';
import 'main_navigation.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _isLoading = false;
  String _error = '';

  Future<void> _login() async {
    setState(() { _isLoading = true; _error = ''; });
    try {
      final res = await ApiService.login(_emailCtrl.text.trim(), _passwordCtrl.text);
      if (res['statusCode'] == 200) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainNavigation()));
      } else {
        setState(() => _error = res['error'] ?? 'Login failed');
      }
    } catch (e) {
      setState(() => _error = 'Network error. Check connection.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: LuxuryGlassCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'StyleMate',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 48),
                ),
                const SizedBox(height: 8),
                Text(
                  'AUTHENTICATE TO ACCESS YOUR PRIVATE WARDROBE',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    fontSize: 10,
                    color: Colors.white54,
                    letterSpacing: 2,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                if (_error.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    color: Colors.redAccent.withOpacity(0.1),
                    child: Text(_error, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                  ),
                  const SizedBox(height: 16),
                ],
                LuxuryTextField(label: 'Email', controller: _emailCtrl),
                LuxuryTextField(label: 'Password', controller: _passwordCtrl, obscureText: true),
                LuxuryButton(
                  text: 'Sign In',
                  isLoading: _isLoading,
                  onPressed: _login,
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text('NEED AN ACCOUNT? REGISTER', style: TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 1.5)),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
