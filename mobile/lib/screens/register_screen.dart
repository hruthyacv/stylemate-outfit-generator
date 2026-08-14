import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../widgets/widgets.dart';
import 'main_navigation.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _isLoading = false;
  String _error = '';

  Future<void> _register() async {
    if (_passwordCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() { _isLoading = true; _error = ''; });
    try {
      final res = await ApiService.register(_nameCtrl.text.trim(), _emailCtrl.text.trim(), _passwordCtrl.text);
      if (res['statusCode'] == 200) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainNavigation()));
      } else {
        setState(() => _error = res['error'] ?? 'Registration failed');
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
                  'CREATE YOUR PRIVATE WARDROBE',
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
                LuxuryTextField(label: 'Name', controller: _nameCtrl),
                LuxuryTextField(label: 'Email', controller: _emailCtrl),
                LuxuryTextField(label: 'Password', controller: _passwordCtrl, obscureText: true),
                LuxuryTextField(label: 'Confirm Password', controller: _confirmCtrl, obscureText: true),
                LuxuryButton(
                  text: 'Create Account',
                  isLoading: _isLoading,
                  onPressed: _register,
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen())),
                  child: const Text('ALREADY HAVE AN ACCOUNT? LOGIN', style: TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 1.5)),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
